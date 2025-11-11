import { ChangeDetectionStrategy, Component, inject, Signal, WritableSignal, computed, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
// FIX: Import 'InternetStatus' to correctly type the signal.
import { ArduinoService, SdCardInfo, SystemConfig, InternetStatus } from '../../services/arduino.service';
import { WebSocketService, ConnectionStatus } from '../../services/websocket.service';
import { SnmpConfigService } from '../../services/snmp-config.service';
import { SnmpService } from '../../services/snmp.service';
import { InternetConnectivityService } from '../../services/internet-connectivity.service';
import { FirmwareUpdateService } from '../../services/firmware-update.service';

@Component({
  selector: 'app-simulation-page',
  imports: [CommonModule],
  templateUrl: './simulation.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimulationComponent {
  protected arduinoService = inject(ArduinoService);
  protected webSocketService = inject(WebSocketService);
  protected snmpConfigService = inject(SnmpConfigService);
  protected snmpService = inject(SnmpService);
  protected internetConnectivityService = inject(InternetConnectivityService);
  protected firmwareUpdateService = inject(FirmwareUpdateService);

  // Expose signals from services for display
  connectionStatus: Signal<ConnectionStatus> = this.webSocketService.connectionStatus;
  sdCardInfo: Signal<SdCardInfo> = this.arduinoService.sdCardInfo;
  temperature: Signal<number> = this.snmpService.temperature;
  // FIX: Correct the type to include 'connecting'.
  internetStatus: Signal<InternetStatus> = this.internetConnectivityService.status;
  linuxCncConnectionStatus: Signal<ConnectionStatus> = this.arduinoService.linuxCncConnectionStatus;
  watchdogConfig: Signal<SystemConfig> = this.arduinoService.watchdogConfig;

  // Internet Connectivity Service properties
  pingEnabled: Signal<boolean> = this.internetConnectivityService.pingEnabled;
  pingTarget: Signal<string> = this.internetConnectivityService.pingTarget;

  // Track manual internet override
  internetOverride: WritableSignal<boolean> = signal(false);

  // --- WebSocket Simulations ---
  simulateWsDisconnect(): void {
    this.webSocketService.simulateDisconnect();
  }

  simulateWsConnect(): void {
    this.webSocketService.simulateConnect();
  }

  // --- SD Card Simulations ---
  simulateSdWriteFailure(): void {
    this.arduinoService.simulateSdWriteFailure();
  }

  simulateSdUnmount(): void {
    this.arduinoService.sdCardInfo.update(info => ({ ...info, status: 'Not Present' }));
    console.log('Simulated SD Card Unmounted.');
  }

  simulateSdMount(): void {
    this.arduinoService.sdCardInfo.update(info => ({ ...info, status: 'Mounted' }));
    console.log('Simulated SD Card Mounted.');
  }

  // --- SNMP Simulations ---
  sendTestTrap(): void {
    this.snmpConfigService.sendTrap('This is a test trap from the Simulation UI.');
  }

  triggerWatchdogReboot(): void {
    this.snmpService.triggerWatchdogReboot();
  }

  simulateHighTemperature(): void {
    this.snmpService.temperature.set(90.0); // Set to a high temperature
    console.log('Simulated high temperature: 90.0°C');
  }

  simulateNormalTemperature(): void {
    this.snmpService.temperature.set(25.0); // Reset to normal temperature
    console.log('Simulated normal temperature: 25.0°C');
  }

  // --- Internet Connectivity Simulations ---
  toggleInternetOffline(): void {
    this.internetOverride.set(true);
    this.internetConnectivityService.status.set('offline');
    this.internetConnectivityService.lastOnlineTimestamp.set(null);
    console.log('Simulated Internet: OFFLINE');
  }

  toggleInternetOnline(): void {
    this.internetOverride.set(true);
    this.internetConnectivityService.status.set('online');
    this.internetConnectivityService.lastOnlineTimestamp.set(Date.now());
    console.log('Simulated Internet: ONLINE');
  }

  resetInternetStatus(): void {
    this.internetOverride.set(false);
    // This effectively lets the service decide based on navigator.onLine or its ping config
    this.internetConnectivityService.status.set(navigator.onLine ? 'online' : 'offline');
    this.internetConnectivityService.lastOnlineTimestamp.set(navigator.onLine ? Date.now() : null);
    console.log('Internet status simulation reset.');
  }

  // NEW: Method to toggle internet ping enabled state
  togglePingEnabled(): void {
    const currentState = this.internetConnectivityService.pingEnabled();
    this.internetConnectivityService.updateConfig({ PING_ENABLED: !currentState });
    console.log(`Internet ping check set to: ${!currentState ? 'Enabled' : 'Disabled'}`);
  }

  // --- LinuxCNC Simulations ---
  simulateLinuxCncDisconnect(): void {
    this.arduinoService.linuxCncConnectionStatus.set('disconnected');
    this.arduinoService.linuxCncLastConnectedTimestamp.set(null);
    console.log('Simulated LinuxCNC: Disconnected');
  }

  simulateLinuxCncConnect(): void {
    this.arduinoService.linuxCncConnectionStatus.set('connecting');
    console.log('Simulated LinuxCNC: Connecting...');
    setTimeout(() => {
      this.arduinoService.linuxCncConnectionStatus.set('connected');
      this.arduinoService.linuxCncLastConnectedTimestamp.set(Date.now());
      console.log('Simulated LinuxCNC: Connected');
    }, 1500); // Simulate connection delay
  }

  // --- Buzzer Simulation ---
  testBuzzerBeep(): void {
    this.arduinoService.triggerBeep(1);
    console.log('Simulated Buzzer: BEEP!');
  }

  // --- Firmware Update Simulation ---
  forceFirmwareUpdateCheck(): void {
    this.firmwareUpdateService.checkForUpdate();
    console.log('Forcing firmware update check.');
  }

  dismissFirmwareUpdate(): void {
    const currentUpdate = this.firmwareUpdateService.updateAvailable();
    if (currentUpdate) {
        this.firmwareUpdateService.dismissVersion(currentUpdate.version);
        console.log(`Dismissed firmware update v${currentUpdate.version}.`);
    } else {
        console.log('No active firmware update to dismiss.');
    }
  }

  // Helper to determine if a ping check is configured
  isPingConfigured = computed(() => this.internetConnectivityService.pingEnabled() && this.internetConnectivityService.pingTarget());

  getSdCardStatusColor(): string {
    const status = this.sdCardInfo().status;
    switch (status) {
      case 'Mounted': return 'text-green-400';
      case 'Not Present': return 'text-red-400';
      case 'Error': return 'text-orange-400';
      default: return 'text-gray-500';
    }
  }

  getTempColor(): string {
    const temp = this.temperature();
    if (temp >= 80) return 'text-red-400';
    if (temp >= 60) return 'text-yellow-400';
    return 'text-green-400';
  }
}
