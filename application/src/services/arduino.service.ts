import { Injectable, signal, WritableSignal, OnDestroy, effect, inject, computed, Signal } from '@angular/core';
import { WebSocketService, ConnectionStatus } from './websocket.service';
import { PersistenceService } from './persistence.service';
import { SnmpConfigService } from './snmp-config.service';
import { SystemLogService, LogLevel } from './system-log.service';
import { versions } from '../version';
import { DigitalOutputConfig, DigitalInputConfig, DEFAULT_DIGITAL_OUTPUTS, DEFAULT_DIGITAL_INPUTS } from './dashboard-settings.service';


export interface LedState {
  color: string; // hex color #RRGGBB or 'off'
  flashing: boolean;
  brightness: number; // 0-255
}

export interface SshConfig {
  ENABLED: boolean;
  USERNAME: string;
  PASSWORD: string;
}

export interface SystemConfig {
  WATCHDOG: boolean;
  WATCHDOG_TIMEOUT: number;
  WATCHDOG_IP: string;
  WATCHDOG_ICMP_INTERVAL: number;
  WATCHDOG_ICMP_FAIL_COUNT: number;
  WATCHDOG_ICMP_DELAY: number;
  VOLTAGE_MONITORING_PIN: number;
  FAILURE_SD_REBOOT: boolean;
  FAILURE_SD_REBOOT_TIMEOUT: number;
  PIN_SHUTDOWN: number;
  WEBSOCKET_PORT: number;
  FIRMWARE: boolean;
  FIRMWARE_TIME: number;
  ACCESS_CODE: string; // NEW: Access code for admin mode
}

export interface NetworkConfig {
  NTP_SERVER: string;
  STATIC_IP: string;
  SUBNET: string;
  GATEWAY_IP: string;
  DNS_SERVER: string;
  DHCP_SERVER_ENABLED: boolean; // NEW: For AP mode
  DHCP_IP_POOL_START: string; // NEW: For AP mode
  DHCP_IP_POOL_END: string; // NEW: For AP mode
  AP_IP: string; // NEW: For AP mode
  AP_SUBNET: string; // NEW: For AP mode
}

export interface WifiConfig {
  MODE: 'AP' | 'Station' | 'Disabled'; // MODIFIED: Added 'Disabled'
  SSID: string;
  PASSWORD: string;
  WIFI_AP_SSID: string;
  WIFI_AP_KEY: string;
  // NEW: Station mode IP assignment settings
  IP_ASSIGNMENT: 'DHCP' | 'Static';
  STATIC_IP: string;
  SUBNET: string;
  GATEWAY_IP: string;
}

export interface WifiStatus {
  status: 'connected' | 'disconnected' | 'disabled'; // MODIFIED: Added 'disabled'
  signalStrength: number; // 0-100
  // NEW: Simulated allocated IP details for Station DHCP mode
  allocatedIp: string;
  allocatedSubnet: string;
  allocatedGateway: string;
}

export interface SystemInfo {
  firmwareVersion: string;
  firmwareDate: string;
  uptime: string;
  ipAddress: string;
  sshEnabled: boolean;
}

export interface SdCardInfo {
  status: 'Uninitialized' | 'Mounted' | 'Not Present' | 'Error';
  usedGb: number;
  totalGb: number;
}

export interface HealthStats {
  startups: number;
  watchdogReboots: number;
}

export interface LedsConfig {
  COUNT_X: number;
  COUNT_Y: number;
  COUNT_YY: number;
  DEFAULT_BRIGHTNESS_X: number;
  DEFAULT_BRIGHTNESS_Y: number;
  DEFAULT_BRIGHTNESS_YY: number;
  AXIS_POSITION_DISPLAY: number;
  IDLE_SERVO_SECONDS: number;
  IDLE_SERVO_DIM: number;
  LED_CHASE: boolean;
  LED_CHASE_TIMEOUT: number;
}

export type LedEffect = 'Solid' | 'Rainbow' | 'Chase' | 'Off';

export interface LedsState {
  power: boolean;
  brightness: number; // 0-255
  color: string; // hex color #RRGGBB
  effect: LedEffect;
}

export interface AlexaConfig {
  ENABLED: boolean;
  ANNOUNCE_DEVICE: string;
  ONBOARD_LED_DEVICE: string;
  SYSTEM_BUZZER_DEVICE: string;
  LEDX_BRIGHTNESS_DEVICE: string;
  LEDY_BRIGHTNESS_DEVICE: string;
  LEDYY_BRIGHTNESS_DEVICE: string;
  SHUTDOWN_DEVICE: string;
  CHASE_EFFECT_DEVICE: string;
}

export interface ServosConfig {
  SLAVE_ID_X: number;
  SLAVE_ID_Y: number;
  SLAVE_ID_YY: number;
}

export interface TableConfig {
  RAIL_X: number;
  RAIL_Y: number;
}

export interface StorageMonitoringConfig {
  SD_CARD_THRESHOLD: number;
  LOCAL_STORAGE_THRESHOLD: number;
  SRAM_THRESHOLD: number;
  EEPROM_THRESHOLD: number;
}

export type RestartReason = 'User Reboot' | 'Watchdog Timeout' | 'SD Card Failure' | 'Shutdown Pin' | 'Normal Power-Up' | 'ICMP Watchdog Timeout';
const RESTART_REASON_KEY = 'fireCNC_restartReason';

@Injectable({
  providedIn: 'root',
})
export class ArduinoService implements OnDestroy {
  private webSocketService = inject(WebSocketService);
  private persistenceService = inject(PersistenceService);
  private snmpConfigService = inject(SnmpConfigService);
  private systemLogService = inject(SystemLogService);
  
  private readonly HEALTH_STATS_KEY = 'fireCNC_healthStats';
  private rebootInProgress = false;
  private watchdogTimer: any;
  private lastHeartbeat: number = Date.now(); // Initialize here
  private icmpWatchdogTimer: any;
  private icmpFailureCount = 0;
  private icmpWatchdogInitialDelayTimer: any;
  private wifiSimulationInterval: any;
  
  digitalOutputs: WritableSignal<boolean[]> = signal(Array(8).fill(false));
  digitalInputs: WritableSignal<boolean[]> = signal(Array(8).fill(false));

  // NEW: Configuration for Digital Outputs and Inputs from ConfigFileService
  digitalOutputsConfig: WritableSignal<DigitalOutputConfig[]> = signal(DEFAULT_DIGITAL_OUTPUTS);
  digitalInputsConfig: WritableSignal<DigitalInputConfig[]> = signal(DEFAULT_DIGITAL_INPUTS);

  sshConfig: WritableSignal<SshConfig> = signal({
    ENABLED: true,
    USERNAME: 'admin',
    PASSWORD: 'password',
  });

  watchdogConfig: WritableSignal<SystemConfig> = signal({
    WATCHDOG: true,
    // Increased default WATCHDOG_TIMEOUT to 120 seconds for better robustness against browser tab throttling.
    WATCHDOG_TIMEOUT: 120,
    WATCHDOG_IP: '192.168.1.1',
    WATCHDOG_ICMP_INTERVAL: 60,
    WATCHDOG_ICMP_FAIL_COUNT: 3,
    WATCHDOG_ICMP_DELAY: 120,
    VOLTAGE_MONITORING_PIN: 3,
    FAILURE_SD_REBOOT: true,
    FAILURE_SD_REBOOT_TIMEOUT: 60,
    PIN_SHUTDOWN: 4,
    WEBSOCKET_PORT: 80,
    FIRMWARE: true,
    FIRMWARE_TIME: 60,
    ACCESS_CODE: '', // NEW: Default to empty string
  });

  networkConfig: WritableSignal<NetworkConfig> = signal({
    NTP_SERVER: '192.168.1.1',
    STATIC_IP: '192.168.1.20',
    SUBNET: '255.255.255.0',
    GATEWAY_IP: '192.168.1.1',
    DNS_SERVER: '192.168.1.1',
    DHCP_SERVER_ENABLED: true, // NEW
    DHCP_IP_POOL_START: '192.168.4.100', // NEW
    DHCP_IP_POOL_END: '192.168.4.200', // NEW
    AP_IP: '192.168.4.1', // NEW
    AP_SUBNET: '255.255.255.0', // NEW
  });

  wifiConfig: WritableSignal<WifiConfig> = signal({
    MODE: 'Station', // MODIFIED
    SSID: 'your_ssid',
    PASSWORD: 'your_password',
    WIFI_AP_SSID: 'fireCNC_AP',
    WIFI_AP_KEY: 'admin123',
    IP_ASSIGNMENT: 'DHCP', // NEW
    STATIC_IP: '192.168.1.21', // NEW
    SUBNET: '255.255.255.0', // NEW
    GATEWAY_IP: '192.168.1.1', // NEW
  });
  
  // MODIFIED: Updated default status and added allocated IP details
  wifiStatus: WritableSignal<WifiStatus> = signal({ 
    status: 'disconnected', 
    signalStrength: 0,
    allocatedIp: '0.0.0.0',
    allocatedSubnet: '0.0.0.0',
    allocatedGateway: '0.0.0.0'
  });

  ledsConfig: WritableSignal<LedsConfig> = signal({
    COUNT_X: 400,
    COUNT_Y: 700,
    COUNT_YY: 700,
    DEFAULT_BRIGHTNESS_X: 128,
    DEFAULT_BRIGHTNESS_Y: 128,
    DEFAULT_BRIGHTNESS_YY: 128,
    AXIS_POSITION_DISPLAY: 5,
    IDLE_SERVO_SECONDS: 60,
    IDLE_SERVO_DIM: 50,
    LED_CHASE: true,
    LED_CHASE_TIMEOUT: 60,
  });

  alexaConfig: WritableSignal<AlexaConfig> = signal({
    ENABLED: true,
    ANNOUNCE_DEVICE: 'fireCNC',
    ONBOARD_LED_DEVICE: 'Onboard LED',
    SYSTEM_BUZZER_DEVICE: 'System Buzzer',
    LEDX_BRIGHTNESS_DEVICE: 'LEDX Brightness',
    LEDY_BRIGHTNESS_DEVICE: 'LEDY Brightness',
    LEDYY_BRIGHTNESS_DEVICE: 'LEDYY Brightness',
    SHUTDOWN_DEVICE: 'System Shutdown',
    CHASE_EFFECT_DEVICE: 'Chase Effect',
  });

  servosConfig: WritableSignal<ServosConfig> = signal({
    SLAVE_ID_X: 3,
    SLAVE_ID_Y: 1,
    SLAVE_ID_YY: 2,
  });

  tableConfig: WritableSignal<TableConfig> = signal({
    RAIL_X: 2000,
    RAIL_Y: 3000,
  });

  storageMonitoringConfig: WritableSignal<StorageMonitoringConfig> = signal({
    SD_CARD_THRESHOLD: 80,
    LOCAL_STORAGE_THRESHOLD: 80,
    SRAM_THRESHOLD: 80,
    EEPROM_THRESHOLD: 80,
  });

  systemInfo: WritableSignal<SystemInfo> = signal({
    firmwareVersion: `v${versions.FIRMWARE_VERSION}`,
    firmwareDate: versions.APP_RELEASE_DATE,
    uptime: '0h 0m 0s',
    ipAddress: '192.168.1.20',
    sshEnabled: true,
  });

  sdCardInfo: WritableSignal<SdCardInfo> = signal({
    status: 'Uninitialized',
    usedGb: 14.8,
    totalGb: 15.9,
  });
  
  sdCardErrorActive: WritableSignal<boolean> = signal(false);
  sdCardErrorTimestamp: WritableSignal<number | null> = signal(null);

  buzzerEnabled: WritableSignal<boolean> = signal(true);
  onboardLed: WritableSignal<LedState> = signal({ color: 'off', flashing: false, brightness: 255 });
  healthStats: WritableSignal<HealthStats>;
  isShuttingDown: WritableSignal<boolean> = signal(false);

  ledsState: WritableSignal<LedsState> = signal({
    power: true,
    brightness: 128,
    color: '#FFA500', // Orange
    effect: 'Solid',
  });
  
  private uptimeInterval: any;
  private uptimeSeconds = 0;
  private previousDigitalInputs: boolean[] = Array(8).fill(false);
  private previousShutdownPinState = false;

  // FIX: Added linuxCncConnectionStatus signal to ArduinoService
  linuxCncConnectionStatus: WritableSignal<ConnectionStatus> = signal('disconnected');
  linuxCncLastConnectedTimestamp: WritableSignal<number | null> = signal(null); // LinuxCNC last connected timestamp

  // Make wifiSignalBars computed signal public
  public wifiSignalBars = computed(() => {
    const status = this.wifiStatus();
    if (status.status !== 'connected') {
      return 0;
    }
    const strength = status.signalStrength;
    if (strength > 80) return 4;
    if (strength > 55) return 3;
    if (strength > 30) return 2;
    if (strength > 0) return 1; // Even a weak signal shows the dot
    return 0;
  });


  constructor() {
    const restartReason = this.persistenceService.getItem<RestartReason>(RESTART_REASON_KEY) ?? 'Normal Power-Up';
    const logMessage = `System startup detected. Reason: ${restartReason}.`;

    const logLevel: LogLevel = (restartReason === 'Normal Power-Up' || restartReason === 'User Reboot') ? 'INFO' : 'WARN';
    this.systemLogService.addSystemLog(logLevel, logMessage);
    
    // Clear the reason so it's not reused on a page refresh
    if (restartReason !== 'Normal Power-Up') {
      this.persistenceService.setItem(RESTART_REASON_KEY, null);
    }
    
    this.startUptimeSimulation();
    this.triggerBeep(2); // Beep twice on power up

    // Initialize health stats from persistence
    const storedStats = this.persistenceService.getItem<HealthStats>(this.HEALTH_STATS_KEY);
    const initialStats: HealthStats = storedStats ?? { startups: 0, watchdogReboots: 0 };
    
    // Increment startup count on initialization
    initialStats.startups++;
    this.persistenceService.setItem(this.HEALTH_STATS_KEY, initialStats);
    this.healthStats = signal(initialStats);
    
    // Effect to keep sshEnabled in sync with the configuration.
    effect(() => {
        const sshConf = this.sshConfig();
        this.systemInfo.update(info => ({...info, sshEnabled: sshConf.ENABLED}));
    });

    // Effect to handle onboard LED status on connection
    effect(() => {
      const status = this.webSocketService.connectionStatus();
      if (status === 'connected') {
        const ip = this.systemInfo().ipAddress;
        // Use static IP for green, otherwise assume DHCP for blue
        const color = ip === this.networkConfig().STATIC_IP ? '#00FF00' : '#0000FF';
        
        this.onboardLed.set({ color, flashing: true, brightness: 255 });
        
        // Stop flashing after 3 seconds, but keep the light on
        setTimeout(() => {
          this.onboardLed.update(s => ({ ...s, flashing: false }));
        }, 3000);
      } else if (status === 'disconnected') {
        this.onboardLed.set({ color: 'off', flashing: false, brightness: 255 });
      }
    });

    // Effect to handle startup count increment on simulated reboots
    effect(() => {
      const status = this.webSocketService.connectionStatus();
      if (status === 'restarting') {
        this.rebootInProgress = true;
      }
      
      // When connection is re-established after a reboot was initiated
      if (status === 'connected' && this.rebootInProgress) {
        this.rebootInProgress = false; // Reset the flag
        this.incrementStartupsOnReboot();
      }
    });

    // Effect to start/stop the hardware watchdog based on configuration and connection status.
    effect(() => {
      const isEnabled = this.watchdogConfig().WATCHDOG;
      const status = this.webSocketService.connectionStatus();

      if (isEnabled && status === 'connected') {
        this.startWatchdog();
      } else {
        this.stopWatchdog();
      }
    });
    
    // Effect to start/stop the ICMP watchdog based on configuration and connection status.
    effect(() => {
      const config = this.watchdogConfig();
      const status = this.webSocketService.connectionStatus();

      if (config.WATCHDOG_IP && status === 'connected') {
        this.startIcmpWatchdog();
      } else {
        this.stopIcmpWatchdog();
      }
    });

    // Effect to trap on GPIO input changes
    effect(() => {
      const currentInputs = this.digitalInputs();
      for (let i = 0; i < currentInputs.length; i++) {
        if (currentInputs[i] !== this.previousDigitalInputs[i]) {
          const status = currentInputs[i] ? 'HIGH' : 'LOW';
          this.snmpConfigService.sendTrap(`GPIO${i + 4} (DI_${i}) changed state to ${status}.`);
        }
      }
      this.previousDigitalInputs = [...currentInputs];
    });

    // Effect to handle shutdown pin
    effect(() => {
      const shutdownPin = this.watchdogConfig().PIN_SHUTDOWN;
      const pinIndex = shutdownPin - 4; // DI_0 is GPIO4, DI_1 is GPIO5 etc.

      if (pinIndex >= 0 && pinIndex < 8) {
        const currentPinState = this.digitalInputs()[pinIndex];
        // Trigger only on the rising edge (from false to true)
        if (currentPinState && !this.previousShutdownPinState) {
          console.log(`Shutdown pin GPIO${shutdownPin} detected as HIGH. Initiating shutdown.`);
          this.shutdownDevice();
        }
        this.previousShutdownPinState = currentPinState;
      }
    });
    
    // MODIFIED: Effect to manage WiFi simulation based on WebSocket status and WiFi config
    effect(() => {
      const ethStatus = this.webSocketService.connectionStatus();
      const wifiMode = this.wifiConfig().MODE;

      if (wifiMode === 'Disabled') {
        this.stopWifiSimulation();
        this.wifiStatus.set({ status: 'disabled', signalStrength: 0, allocatedIp: '0.0.0.0', allocatedSubnet: '0.0.0.0', allocatedGateway: '0.0.0.0' });
      } else if (ethStatus === 'connected') {
        // If Ethernet is connected, WiFi is off (fallback scenario, or if not primary)
        this.stopWifiSimulation();
        this.wifiStatus.set({ status: 'disconnected', signalStrength: 0, allocatedIp: '0.0.0.0', allocatedSubnet: '0.0.0.0', allocatedGateway: '0.0.0.0' });
      } else if (ethStatus === 'disconnected' && wifiMode === 'Station') {
        // If Ethernet is disconnected and WiFi is enabled and in Station mode, try to connect via WiFi
        this.startWifiSimulation();
      } else if (ethStatus === 'disconnected' && wifiMode === 'AP') {
        // If Ethernet is disconnected and WiFi is enabled in AP mode, simulate AP active
        this.stopWifiSimulation(); // Ensure no station mode simulation
        const netConf = this.networkConfig();
        this.wifiStatus.set({ 
          status: 'connected', // AP is 'connected' in the sense it's active
          signalStrength: 100, // AP always has strong signal
          allocatedIp: netConf.AP_IP, // AP's own IP
          allocatedSubnet: netConf.AP_SUBNET,
          allocatedGateway: netConf.AP_IP // Gateway for AP is usually itself
        });
      }
    });

    // Add simulation for LinuxCNC connection
    effect(() => {
      if (this.webSocketService.connectionStatus() === 'connected') { // Depend on ESP32 connection
        // When ESP32 connects, simulate LinuxCNC connecting after a delay
        setTimeout(() => {
          this.linuxCncConnectionStatus.set('connecting');
          setTimeout(() => {
            this.linuxCncConnectionStatus.set('connected');
            this.linuxCncLastConnectedTimestamp.set(Date.now()); // Set timestamp
          }, 2000); // 2 seconds to connect
        }, 1500); // start connecting 1.5s after ESP32 is connected
      } else {
        // If ESP32 is not connected, LinuxCNC should be disconnected too
        this.linuxCncConnectionStatus.set('disconnected');
        this.linuxCncLastConnectedTimestamp.set(null); // Clear timestamp
      }
    });

    // Simulate SD card initialization after a short delay
    setTimeout(() => this.simulateSdInitialization(), 1000);

    // Reactively trigger a simulated WebSocket connect when the port configuration changes.
    effect(() => {
      const port = this.watchdogConfig().WEBSOCKET_PORT; // Read port to create dependency
      // Call simulateConnect explicitly here on initial load and config changes.
      // The WebSocketService itself no longer needs the URL, as it's fully simulated.
      this.webSocketService.simulateConnect(); 
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.uptimeInterval);
    this.stopWatchdog();
    this.stopIcmpWatchdog();
    this.stopWifiSimulation();
  }
  
  public triggerBeep(times: number): void {
    if (!this.buzzerEnabled()) return;
    console.log(`BEEP x${times}`); // Simulation
  }
  
  public triggerSdErrorVisual(reason: string): void {
    if (this.sdCardErrorActive()) return; // Already in error state

    console.error(`SD Card Error Triggered: ${reason}`);
    this.sdCardErrorActive.set(true);
    this.sdCardErrorTimestamp.set(Date.now());
    this.triggerBeep(3);
    this.snmpConfigService.sendTrap(reason);

    const config = this.watchdogConfig();
    if (config.FAILURE_SD_REBOOT) {
      console.log(`Scheduling reboot in ${config.FAILURE_SD_REBOOT_TIMEOUT} seconds due to SD card failure.`);
      setTimeout(() => {
        this.rebootDevice('SD Card Failure');
      }, config.FAILURE_SD_REBOOT_TIMEOUT * 1000);
    }
  }

  private simulateSdInitialization(): void {
    // Simulate successful initialization. The random failure has been removed for stability.
    this.sdCardInfo.update(s => ({ ...s, status: 'Mounted' }));
    this.snmpConfigService.sendTrap('SD Card initialized and mounted successfully.');
    // The config service will now attempt to load and will beep on success.
  }

  public rebootDevice(reason: RestartReason = 'User Reboot'): void {
    this.persistenceService.setItem(RESTART_REASON_KEY, reason);
    this.triggerBeep(3);
    this.webSocketService.setRestarting(); // Set WebSocket status to restarting
    clearInterval(this.uptimeInterval);
    // The watchdogs are stopped automatically by effects that monitor connection status.

    setTimeout(() => {
        console.log(`Simulating device reboot (Reason: ${reason}): resetting state and reconnecting.`);
        this.isShuttingDown.set(false); // Ensure this is reset on reboot
        this.uptimeSeconds = 0;
        this.systemInfo.update(info => ({ ...info, uptime: '0h 0m 0s' }));
        this.startUptimeSimulation(); // Uptime and heartbeat simulation restarts here.

        // Now, trigger the simulated WebSocket connection
        this.webSocketService.simulateConnect();
    }, 5000); // 5-second reboot delay
  }

  public shutdownDevice(): void {
    if (this.isShuttingDown()) return; // Prevent multiple triggers

    this.snmpConfigService.sendTrap('Shutdown Initiated via GPIO pin.');
    this.isShuttingDown.set(true);
    
    // The servo-control.service will handle the 5-second LED fade out.
    // After that period, we finalize the shutdown by simulating a reboot.
    setTimeout(() => {
        console.log('Simulating device reboot from shutdown pin.');
        this.rebootDevice('Shutdown Pin');
    }, 5500); // Allow a little extra time for the fade
  }

  private startUptimeSimulation() {
    this.uptimeInterval = setInterval(() => {
      this.uptimeSeconds++;
      this.lastHeartbeat = Date.now(); // "Pet" the hardware watchdog
      const d = Math.floor(this.uptimeSeconds / (3600*24));
      const h = Math.floor(this.uptimeSeconds % (3600*24) / 3600);
      const m = Math.floor(this.uptimeSeconds % 3600 / 60);
      const s = Math.floor(this.uptimeSeconds % 60);
      
      let uptimeString = '';
      if (d > 0) uptimeString += `${d}d `;
      uptimeString += `${h}h ${m}m ${s}s`;

      this.systemInfo.update(info => ({ ...info, uptime: uptimeString }));
    }, 1000);
  }

  private simulateLatency(callback: () => void) {
    setTimeout(callback, 100 + Math.random() * 200);
  }

  public setDigitalOutput(index: number, state: boolean): void {
    if (index < 0 || index > 7) return;

    this.simulateLatency(() => {
      this.digitalOutputs.update(outputs => {
        const newOutputs = [...outputs];
        newOutputs[index] = state;
        return newOutputs;
      });
      // In a real app, this would send a command via WebSocket
      console.log(`SET DO_${index}=${state ? 'ON' : 'OFF'}`);
    });
  }

  public toggleBuzzer(): void {
    this.buzzerEnabled.update(enabled => !enabled);
    console.log(`SET BUZZER=${this.buzzerEnabled() ? 'ON' : 'OFF'}`);
  }

  public updateSshConfig(config: SshConfig): void {
    this.sshConfig.set(config);
    console.log('ArduinoService SSH config updated:', config);
  }

  public updateSystemConfig(config: SystemConfig): void {
    this.watchdogConfig.set(config);
    console.log('ArduinoService System config updated:', config);
  }

  public updateNetworkAndWifiConfig(networkConfig: NetworkConfig, wifiConfig: WifiConfig): void {
    this.networkConfig.set(networkConfig);
    this.wifiConfig.set(wifiConfig);
    console.log('ArduinoService Network config updated:', networkConfig);
    console.log('ArduinoService Wifi config updated:', wifiConfig);
  }

  public updateLedsConfig(config: LedsConfig): void {
    this.ledsConfig.set(config);
    console.log('ArduinoService Leds config updated:', config);
  }

  public updateAlexaConfig(config: AlexaConfig): void {
    this.alexaConfig.set(config);
    console.log('ArduinoService Alexa config updated:', config);
  }
  
  public updateServosAndTableConfig(servosConfig: ServosConfig, tableConfig: TableConfig): void {
    this.servosConfig.set(servosConfig);
    this.tableConfig.set(tableConfig);
    console.log('ArduinoService Servos config updated:', servosConfig);
    console.log('ArduinoService Table config updated:', tableConfig);
  }

  public updateStorageMonitoringConfig(config: StorageMonitoringConfig): void {
    this.storageMonitoringConfig.set(config);
    console.log('ArduinoService Storage Monitoring config updated:', config);
  }

  public updateLedsState(newState: Partial<LedsState>): void {
    this.ledsState.update(current => ({ ...current, ...newState }));
    console.log('LEDS state updated:', this.ledsState());
    // This would send a command via WebSocket in a real app
  }

  public updateOnboardLedState(newState: Partial<LedState>): void {
    this.onboardLed.update(current => ({ ...current, ...newState }));
    console.log('Onboard LED state updated:', this.onboardLed());
  }

  private incrementStartupsOnReboot(): void {
    this.healthStats.update(stats => {
      const newStats = { ...stats, startups: stats.startups + 1 };
      this.persistenceService.setItem(this.HEALTH_STATS_KEY, newStats);
      return newStats;
    });
  }

  // FIX: Made method public to be accessible from other services.
  public incrementWatchdogRebootsAndReboot(): void {
    this.healthStats.update(stats => {
      const newStats = { ...stats, watchdogReboots: stats.watchdogReboots + 1 };
      this.persistenceService.setItem(this.HEALTH_STATS_KEY, newStats);
      console.log('Watchdog reboot triggered! New count:', newStats.watchdogReboots);
      return newStats;
    });
    this.rebootDevice('Watchdog Timeout');
  }

  public simulateSdWriteFailure(): void {
    this.snmpConfigService.sendTrap('SD Card Error: Failed to write to file.');
    console.error('Simulated SD Card Write Failure.');
  }

  private startWatchdog() {
    if (this.watchdogTimer) {
      return; // Already running
    }
    console.log(`Hardware Watchdog started with a timeout of ${this.watchdogConfig().WATCHDOG_TIMEOUT} seconds.`);
    this.watchdogTimer = setInterval(() => {
      const timeoutMillis = this.watchdogConfig().WATCHDOG_TIMEOUT * 1000;
      if (Date.now() - this.lastHeartbeat > timeoutMillis) {
        console.error('Hardware Watchdog timeout! Device unresponsive. Rebooting...');
        this.stopWatchdog();
        this.incrementWatchdogRebootsAndReboot();
      }
    }, 1000); // Check every second
  }

  private stopWatchdog() {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
      console.log('Hardware Watchdog stopped.');
    }
  }

  private startIcmpWatchdog() {
    this.stopIcmpWatchdog(); // Ensure no multiple timers are running
    const config = this.watchdogConfig();
    console.log(`ICMP Watchdog will start pinging ${config.WATCHDOG_IP} after a delay of ${config.WATCHDOG_ICMP_DELAY} seconds.`);
    
    this.icmpWatchdogInitialDelayTimer = setTimeout(() => {
      console.log(`ICMP Watchdog initial delay finished. Starting periodic pings every ${config.WATCHDOG_ICMP_INTERVAL} seconds.`);
      this.simulatePing(); // Perform first ping immediately
      this.icmpWatchdogTimer = setInterval(() => {
        this.simulatePing();
      }, config.WATCHDOG_ICMP_INTERVAL * 1000);
    }, config.WATCHDOG_ICMP_DELAY * 1000);
  }

  private stopIcmpWatchdog() {
    clearTimeout(this.icmpWatchdogInitialDelayTimer);
    this.icmpWatchdogInitialDelayTimer = null;
    clearInterval(this.icmpWatchdogTimer);
    this.icmpWatchdogTimer = null;
    if (this.icmpFailureCount > 0) {
      console.log('ICMP Watchdog stopped. Failure count reset.');
    }
    this.icmpFailureCount = 0;
  }
  
  // MODIFIED: Updated startWifiSimulation to reflect Station DHCP behavior
  private startWifiSimulation(): void {
    if (this.wifiSimulationInterval) return; // Already running
    
    // Simulate a connection delay
    setTimeout(() => {
      const wifiConf = this.wifiConfig();
      let status: WifiStatus;

      if (wifiConf.IP_ASSIGNMENT === 'DHCP') {
        status = { 
          status: 'connected', 
          signalStrength: 75,
          allocatedIp: '192.168.1.105', // Simulated DHCP allocated
          allocatedSubnet: '255.255.255.0',
          allocatedGateway: '192.168.1.1'
        };
      } else { // Static IP
        status = { 
          status: 'connected', 
          signalStrength: 80, // Static could have slightly better stability
          allocatedIp: wifiConf.STATIC_IP,
          allocatedSubnet: wifiConf.SUBNET,
          allocatedGateway: wifiConf.GATEWAY_IP
        };
      }
      
      this.wifiStatus.set(status);
      
      this.wifiSimulationInterval = setInterval(() => {
        this.wifiStatus.update(current => {
          if (current.status === 'connected') {
            // Fluctuate signal strength
            const fluctuation = (Math.random() - 0.5) * 20;
            let newStrength = current.signalStrength + fluctuation;
            // Clamp between 5 and 100
            newStrength = Math.max(5, Math.min(100, newStrength));
            return { ...current, signalStrength: Math.round(newStrength) };
          }
          return current;
        });
      }, 3000); // Update every 3 seconds

    }, 2000); // 2 second delay to "connect"
  }

  private stopWifiSimulation(): void {
    if (this.wifiSimulationInterval) {
      clearInterval(this.wifiSimulationInterval);
      this.wifiSimulationInterval = null;
    }
  }

  private simulatePing() {
    const config = this.watchdogConfig();
    const ip = config.WATCHDOG_IP;
    const success = true; // No longer randomly fails

    if (success) {
      console.log(`ICMP Ping to ${ip}: Success.`);
      this.systemLogService.addSystemLog('DEBUG', `ICMP Ping to ${ip}: Success.`);
      if (this.icmpFailureCount > 0) {
        this.systemLogService.addSystemLog('INFO', `ICMP Watchdog target ${ip} is responsive again.`);
      }
      this.icmpFailureCount = 0;
    } else {
      this.icmpFailureCount++;
      console.warn(`ICMP Ping to ${ip}: Failed (Attempt ${this.icmpFailureCount}/${config.WATCHDOG_ICMP_FAIL_COUNT}).`);
      this.systemLogService.addSystemLog('WARN', `ICMP Ping to ${ip}: Failed (Attempt ${this.icmpFailureCount}/${config.WATCHDOG_ICMP_FAIL_COUNT}).`);

      if (this.icmpFailureCount >= config.WATCHDOG_ICMP_FAIL_COUNT) {
        console.error(`ICMP Watchdog: Target ${ip} unresponsive for ${this.icmpFailureCount} consecutive checks. Rebooting...`);
        this.systemLogService.addSystemLog('ERROR', `ICMP Watchdog: Target ${ip} unresponsive. Rebooting device.`);
        this.stopIcmpWatchdog();
        this.rebootDevice('ICMP Watchdog Timeout');
      }
    }
  }

  // NEW: Status utility methods for ESP32 and LinuxCNC
  public getStatusColorClass(): string {
    const status = this.webSocketService.connectionStatus();
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'restarting':
        return 'bg-blue-500';
      case 'disconnected':
        return 'bg-red-500';
    }
  }

  public getStatusText(): string {
    const status = this.webSocketService.connectionStatus();
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'restarting':
        return 'Restarting...';
      case 'disconnected':
        return 'Disconnected';
    }
  }
  
  public getLinuxCncStatusColorClass(): string {
    const status = this.linuxCncConnectionStatus();
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'restarting':
        return 'bg-blue-500';
      case 'disconnected':
        return 'bg-red-500';
    }
  }

  public getLinuxCncStatusText(): string {
    const status = this.linuxCncConnectionStatus();
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'restarting':
        return 'Restarting...';
      case 'disconnected':
        return 'Disconnected';
    }
  }

  // Make public to allow reuse in other components
  public getWifiSignalColorClass(): string {
    const wifiStatus = this.wifiStatus();
    const wifiMode = this.wifiConfig().MODE;

    if (wifiMode === 'AP') {
      return 'text-blue-400'; // Distinct color for AP mode
    }
    if (wifiStatus.status === 'disconnected') {
      return 'text-gray-600';
    }

    switch (this.wifiSignalBars()) {
      case 4:
      case 3:
        return 'text-green-400';
      case 2:
        return 'text-yellow-400';
      case 1:
        return 'text-red-400'; // Poor signal
      default:
        return 'text-gray-600';
    }
  }
}