/**
 * @file src/services/arduino.service.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * This service acts as a primary facade for interacting with the state and
 * configuration of the simulated fireCNC hardware. It consolidates data and
 * functionality from more granular services (`IoService`, `NetworkService`,
 * `SystemStateService`, `ConfigService`) to provide a unified API for the rest
 * of the application, resolving previous circular dependencies and centralizing
 * hardware-related logic.
 */
import { Injectable, computed, inject } from '@angular/core';
import { IoService } from './io.service';
import { NetworkService } from './network.service';
import { SystemStateService } from './system-state.service';
// FIX: Import SnmpConfig and InternetStatus from state.service.ts to fix circular dependency and export issues.
import { StateService, LedState, LedsState, LedEffect, WifiConfig, NetworkConfig, LedsConfig, TableConfig, AlexaConfig, ServosConfig, SystemConfig, StorageMonitoringConfig, SystemInfo, SdCardInfo, HealthStats, WifiStatus, DigitalOutputConfig, DigitalInputConfig, SshConfig, SnmpConfig, InternetStatus } from './state.service';
import { ConnectionStatus } from './websocket.service';
// REMOVED: import { InternetStatus } from './internet-connectivity.service';

// Re-exporting types for consumers of ArduinoService
export { SshConfig, LedState, LedsState, LedEffect, WifiConfig, NetworkConfig, LedsConfig, TableConfig, AlexaConfig, ServosConfig, SystemConfig, StorageMonitoringConfig, SystemInfo, SdCardInfo, HealthStats, WifiStatus, DigitalOutputConfig, DigitalInputConfig, ConnectionStatus, InternetStatus, SnmpConfig };


@Injectable({
  providedIn: 'root'
})
export class ArduinoService {
  private ioService = inject(IoService);
  private networkService = inject(NetworkService);
  private systemStateService = inject(SystemStateService);
  private stateService = inject(StateService);

  // --- State Signals from StateService ---

  // I/O State
  digitalOutputs = this.stateService.digitalOutputs;
  digitalInputs = this.stateService.digitalInputs;
  buzzerEnabled = this.stateService.buzzerEnabled;

  // Network State
  wifiStatus = this.stateService.wifiStatus;
  linuxCncConnectionStatus = this.stateService.linuxCncConnectionStatus;
  linuxCncLastConnectedTimestamp = this.stateService.linuxCncLastConnectedTimestamp;
  linuxCncLastFailedTimestamp = this.stateService.linuxCncLastFailedTimestamp;
  connectionStatus = this.stateService.connectionStatus;
  internetStatus = this.stateService.internetStatus;

  // System State
  systemInfo = this.stateService.systemInfo;
  sdCardInfo = this.stateService.sdCardInfo;
  sdCardErrorActive = this.stateService.sdCardErrorActive;
  sdCardErrorTimestamp = this.stateService.sdCardErrorTimestamp;
  onboardLed = this.stateService.onboardLed;
  healthStats = this.stateService.healthStats;
  isShuttingDown = this.stateService.isShuttingDown;
  
  // Config State
  sshConfig = this.stateService.sshConfig;
  watchdogConfig = this.stateService.watchdogConfig;
  networkConfig = this.stateService.networkConfig;
  wifiConfig = this.stateService.wifiConfig;
  ledsConfig = this.stateService.ledsConfig;
  ledsState = this.stateService.ledsState;
  alexaConfig = this.stateService.alexaConfig;
  servosConfig = this.stateService.servosConfig;
  tableConfig = this.stateService.tableConfig;
  storageMonitoringConfig = this.stateService.storageMonitoringConfig;
  digitalOutputsConfig = this.stateService.digitalOutputsConfig;
  digitalInputsConfig = this.stateService.digitalInputsConfig;
  snmpConfig = this.stateService.snmpConfig;

  // --- Actions / Methods from Logic Services ---

  // From IoService
  setDigitalOutput = this.ioService.setDigitalOutput.bind(this.ioService);
  toggleBuzzer = this.ioService.toggleBuzzer.bind(this.ioService);
  triggerBeep = this.ioService.triggerBeep.bind(this.ioService);

  // From SystemStateService
  rebootDevice = this.systemStateService.rebootDevice.bind(this.systemStateService);
  shutdownDevice = this.systemStateService.shutdownDevice.bind(this.systemStateService);
  updateOnboardLedState = this.systemStateService.updateOnboardLedState.bind(this.systemStateService);
  incrementWatchdogRebootsAndReboot = this.systemStateService.incrementWatchdogRebootsAndReboot.bind(this.systemStateService);
  simulateSdWriteFailure = this.systemStateService.simulateSdWriteFailure.bind(this.systemStateService);
  
  // From Config-related services (now direct to StateService)
  updateLedsState(newState: Partial<LedsState>): void {
    this.stateService.ledsState.update(current => ({ ...current, ...newState }));
    console.log('Main LED Strips state updated:', this.stateService.ledsState());
  }
  
  // --- Computed Properties / Selectors ---

  // Color/text helpers
  getConnectionStatusText(status: ConnectionStatus | InternetStatus): string {
    switch (status) {
      case 'online':
      case 'connected':
        return 'Connected';
      case 'offline':
      case 'disconnected':
        return 'Disconnected';
      case 'connecting':
        return 'Connecting...';
      case 'restarting':
        return 'Restarting...';
      default:
        return 'Unknown';
    }
  }

  getConnectionStatusColorClass(status: ConnectionStatus | InternetStatus): string {
    switch (status) {
      case 'online':
      case 'connected':
        return 'bg-green-500 shadow-[0_0_4px_theme(colors.green.400)] text-green-400';
      case 'offline':
      case 'disconnected':
        return 'bg-red-500 shadow-[0_0_4px_theme(colors.red.400)] text-red-400';
      case 'connecting':
        return 'bg-yellow-500 shadow-[0_0_4px_theme(colors.yellow.400)] text-yellow-400 animate-pulse';
      case 'restarting':
        return 'bg-blue-500 shadow-[0_0_4px_theme(colors.blue.400)] text-blue-400 animate-pulse';
      default:
        return 'bg-gray-500 text-gray-400';
    }
  }

  getWifiSignalColorClass = computed(() => {
    const status = this.wifiStatus();
    if (status.status !== 'connected') {
      return 'text-gray-500';
    }
    const strength = status.signalStrength;
    if (strength > 80) return 'text-green-400';
    if (strength > 55) return 'text-yellow-400';
    if (strength > 30) return 'text-orange-400';
    return 'text-red-400';
  });
}
