/**
 * @file src/services/state.service.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * The centralized "App Store" for the application. This service acts as the single
 * source of truth, holding all application state as `WritableSignal`s. It is a pure
 * state container with no business logic.
 */
import { Injectable, signal, WritableSignal } from '@angular/core';
import { ConnectionStatus } from './websocket.service';
// FIX: Define InternetStatus here to break circular dependency.
// import { InternetStatus } from './internet-connectivity.service';
import { LogEntry, LogLevel } from './system-log.service';
import { SnmpTrapEntry } from './snmp-trap-log.service';
import { FirmwareUpdateInfo } from './firmware-update.service';
import { DashboardLayout, DigitalOutputConfig, DigitalInputConfig, AnalogInputConfig, DEFAULT_LAYOUT, DEFAULT_DIGITAL_OUTPUTS, DEFAULT_DIGITAL_INPUTS, DEFAULT_ANALOG_INPUTS } from './dashboard-settings.service';
import { SnmpConfig, SnmpProtocol } from './snmp-config.service';
import { ServoPositions, ServoLimits, SramInfo, EepromInfo } from './snmp.service';
import { Module } from './module.service';
import { ServoState, LedPixel } from './servo-control.service';

// FIX: Define InternetStatus here.
export type InternetStatus = 'online' | 'offline' | 'connecting';

// FIX: Alexa interfaces moved here to break circular dependency
export interface AlexaAnnouncement {
  timestamp: Date;
  message: string;
}

export type AlexaDeviceType = 'Dimmable Light' | 'Color Light' | 'Switch' | 'Contact Sensor' | 'Motion Sensor';

export interface AlexaDevice {
  name: string;
  type: AlexaDeviceType;
  state: {
    on: boolean;
    brightness?: number; // 0-100 for Alexa, maps to 0-255
    color?: string; // hex
  };
  key: string; 
}


// --- Re-exported Interfaces for global state ---
export type { ConnectionStatus } from './websocket.service';
export type { LogEntry, LogLevel } from './system-log.service';
export type { SnmpTrapEntry } from './snmp-trap-log.service';
export type { FirmwareUpdateInfo } from './firmware-update.service';
export type { DashboardLayout, DigitalOutputConfig, DigitalInputConfig, AnalogInputConfig } from './dashboard-settings.service';
export type { SnmpConfig, SnmpProtocol } from './snmp-config.service';
export type { ServoPositions, ServoLimits, SramInfo, EepromInfo } from './snmp.service';
export type { Module } from './module.service';
export type { ServoState, LedPixel } from './servo-control.service';


// --- Config-related Interfaces ---
export interface SshConfig {
  ENABLED: boolean;
  USERNAME: string;
  PASSWORD_SET: boolean;
  PASSWORD?: string;
}

export interface SystemConfig {
  WATCHDOG: boolean;
  WATCHDOG_TIMEOUT: number;
  WEBSOCKET_URL: string;
  FIRMWARE: boolean;
  FIRMWARE_TIME: number;
  ACCESS_CODE: string;
  TEXT_SELECTION_ENABLED: boolean;
  BUZZER_ENABLED: boolean;
  PIN_SHUTDOWN: number;
  WATCHDOG_IP: string;
  WATCHDOG_ICMP_DELAY: number;
  WATCHDOG_ICMP_INTERVAL: number;
  WATCHDOG_ICMP_FAIL_COUNT: number;
  FAILURE_SD_REBOOT: boolean;
  FAILURE_SD_REBOOT_TIMEOUT: number;
  VOLTAGE_MONITORING_PIN: number;
  CONFIG_CHANGE_TIMEOUT: number;
}

export interface NetworkConfig {
  NTP_SERVER: string;
  STATIC_IP: string;
  SUBNET: string;
  GATEWAY_IP: string;
  DNS_SERVER: string;
  DHCP_SERVER_ENABLED: boolean;
  DHCP_IP_POOL_START: string;
  DHCP_IP_POOL_END: string;
  AP_IP: string;
  AP_SUBNET: string;
}

export interface WifiConfig {
  MODE: 'AP' | 'Station' | 'Disabled';
  SSID: string;
  PASSWORD_SET: boolean;
  WIFI_AP_SSID: string;
  WIFI_AP_KEY_SET: boolean;
  IP_ASSIGNMENT: 'DHCP' | 'Static';
  STATIC_IP: string;
  SUBNET: string;
  GATEWAY_IP: string;
}

export interface LedsConfig {
  COUNT_X: number;
  COUNT_Y: number;
  COUNT_YY: number;
  DEFAULT_BRIGHTNESS_X: number;
  DEFAULT_BRIGHTNESS_Y: number;
  DEFAULT_BRIGHTNESS_YY: number;
  IDLE_SERVO_SECONDS: number;
  IDLE_SERVO_DIM: number;
  AXIS_POSITION_DISPLAY: number;
  LED_CHASE: boolean;
  LED_CHASE_TIMEOUT: number;
  DYNAMIC_BRIGHTNESS_ENABLED: boolean;
  MAX_POWER_CONSUMPTION: number;
  POWER_WARNING_THRESHOLD: number;
}

export interface LedState {
  color: string;
  flashing: boolean;
  brightness: number;
}

export type LedEffect = 'Solid' | 'Rainbow' | 'Chase' | 'Off';

export interface LedsState {
  power: boolean;
  brightness: number;
  color: string;
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
  ANNOUNCE_BANNERS_ENABLED: boolean;
  ANNOUNCEMENT_TYPES: {
    key: string;
    description: string;
    enabled: boolean;
  }[];
}

export interface ServosConfig {
  SLAVE_ID_X: number;
  SLAVE_ID_Y: number;
  SLAVE_ID_YY: number;
  SLAVE_ID_Z: number;
  MODBUS_TIMEOUT: number;
}

export interface TableConfig {
  RAIL_X: number;
  RAIL_Y: number;
  RAIL_Z: number;
}

export interface StorageMonitoringConfig {
  SD_CARD_THRESHOLD: number;
  LOCAL_STORAGE_THRESHOLD: number;
  SRAM_THRESHOLD: number;
  EEPROM_THRESHOLD: number;
}


// --- System State Interfaces ---

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

export interface WifiStatus {
  status: 'connected' | 'disconnected' | 'disabled';
  signalStrength: number;
  allocatedIp: string;
  allocatedSubnet: string;
  allocatedGateway: string;
}

@Injectable({
  providedIn: 'root'
})
export class StateService {
  // --- Config State ---
  sshConfig: WritableSignal<SshConfig> = signal({} as SshConfig);
  watchdogConfig: WritableSignal<SystemConfig> = signal({} as SystemConfig);
  networkConfig: WritableSignal<NetworkConfig> = signal({} as NetworkConfig);
  wifiConfig: WritableSignal<WifiConfig> = signal({} as WifiConfig);
  ledsConfig: WritableSignal<LedsConfig> = signal({} as LedsConfig);
  alexaConfig: WritableSignal<AlexaConfig> = signal({} as AlexaConfig);
  servosConfig: WritableSignal<ServosConfig> = signal({} as ServosConfig);
  tableConfig: WritableSignal<TableConfig> = signal({} as TableConfig);
  storageMonitoringConfig: WritableSignal<StorageMonitoringConfig> = signal({} as StorageMonitoringConfig);
  snmpConfig: WritableSignal<SnmpConfig> = signal({
    TRAP_TARGET: '0.0.0.0',
    TRAP_PORT: 162,
    TRAP_COMMUNITY: 'SNMP_trap',
    TRAP_PROTOCOL: 'UDP' as SnmpProtocol,
    COMMUNITY: 'public',
    PORT: 161,
    PROTOCOL: 'UDP' as SnmpProtocol,
    TRAP_LEVEL: 'ERROR' as LogLevel,
    TRAPS_ENABLED: true,
    TRAP_LOG_PATH: '/logs/snmp_trap.log',
    AGENT_ENABLED: true,
    DISPLAY_OID_ON_STATUS_PAGE: true,
  });

  // --- Dashboard Config State ---
  digitalOutputsConfig: WritableSignal<DigitalOutputConfig[]> = signal(DEFAULT_DIGITAL_OUTPUTS);
  digitalInputsConfig: WritableSignal<DigitalInputConfig[]> = signal(DEFAULT_DIGITAL_INPUTS);
  analogInputsConfig: WritableSignal<AnalogInputConfig[]> = signal(DEFAULT_ANALOG_INPUTS);
  layout: WritableSignal<DashboardLayout> = signal(DEFAULT_LAYOUT);

  // --- Runtime State ---
  ledsState: WritableSignal<LedsState> = signal({
    power: true,
    brightness: 128,
    color: '#FFFFFF',
    effect: 'Solid'
  });

  digitalOutputs: WritableSignal<boolean[]> = signal(Array(8).fill(false));
  digitalInputs: WritableSignal<boolean[]> = signal(Array(8).fill(false));
  buzzerEnabled: WritableSignal<boolean> = signal(true);

  systemInfo: WritableSignal<SystemInfo> = signal({} as SystemInfo);
  sdCardInfo: WritableSignal<SdCardInfo> = signal({} as SdCardInfo);
  sdCardErrorActive: WritableSignal<boolean> = signal(false);
  sdCardErrorTimestamp: WritableSignal<number | null> = signal(null);
  onboardLed: WritableSignal<LedState> = signal({ color: 'off', flashing: false, brightness: 255 });
  healthStats: WritableSignal<HealthStats> = signal({ startups: 0, watchdogReboots: 0 });
  isShuttingDown: WritableSignal<boolean> = signal(false);

  wifiStatus: WritableSignal<WifiStatus> = signal({} as WifiStatus);
  linuxCncConnectionStatus: WritableSignal<ConnectionStatus> = signal('disconnected');
  linuxCncLastConnectedTimestamp: WritableSignal<number | null> = signal(null);
  linuxCncLastFailedTimestamp: WritableSignal<number | null> = signal(null);

  connectionStatus: WritableSignal<ConnectionStatus> = signal('disconnected');
  logMessages: WritableSignal<string[]> = signal([]);
  lastConnectedTimestamp: WritableSignal<number | null> = signal(null);
  lastFailedTimestamp: WritableSignal<number | null> = signal(null);

  internetStatus: WritableSignal<InternetStatus> = signal('offline');
  pingEnabled: WritableSignal<boolean> = signal(true);
  pingTarget: WritableSignal<string> = signal('8.8.8.8');
  lastOnlineTimestamp: WritableSignal<number | null> = signal(null);
  lastPingSuccessTimestamp: WritableSignal<number | null> = signal(null);
  lastInternetFailedTimestamp: WritableSignal<number | null> = signal(null);

  adcVoltage: WritableSignal<number> = signal(3.3);
  temperature: WritableSignal<number> = signal(25.0);
  sramInfo: WritableSignal<SramInfo> = signal({ totalKb: 8192.0, usedKb: 3200.0, freeKb: 4992.0, largestFreeBlockKb: 3840.0 });
  eepromInfo: WritableSignal<EepromInfo> = signal({ totalBytes: 512, usedBytes: 128 });
  analogInputs: WritableSignal<number[]> = signal([1024, 2048, 3072, 4095]);

  logEntries: WritableSignal<LogEntry[]> = signal([]);
  trapLogEntries: WritableSignal<SnmpTrapEntry[]> = signal([]);

  updateAvailable: WritableSignal<FirmwareUpdateInfo | null> = signal(null);
  githubAppVersionInfo: WritableSignal<FirmwareUpdateInfo | null> = signal(null);
  githubFirmwareVersionInfo: WritableSignal<FirmwareUpdateInfo | null> = signal(null);
  applyFadeOutSignal: WritableSignal<boolean> = signal(false);

  isAdminMode: WritableSignal<boolean> = signal(false);

  // --- Config File State ---
  configFileContent: WritableSignal<string> = signal('');
  parseError: WritableSignal<string | null> = signal(null);
  remoteConfigStatus = signal<'unknown' | 'loading' | 'remote' | 'local' | 'error'>('unknown');
  remoteConfigEnabled: WritableSignal<boolean> = signal(false);
  remoteConfigUrl: WritableSignal<string | null> = signal(null);
  lastSavedTimestamp = signal<number | null>(null);
  configurationVersion = signal<number>(0);
  fileSize = signal<number>(0);
  variableCount = signal<number>(0);
  filePath = signal<string>('/etc/firecnc.conf');

  // --- Servo State ---
  servoX: WritableSignal<ServoState> = signal({} as ServoState);
  servoY: WritableSignal<ServoState> = signal({} as ServoState);
  servoYY: WritableSignal<ServoState> = signal({} as ServoState);
  servoZ: WritableSignal<ServoState> = signal({} as ServoState);
  ledStripX: WritableSignal<LedPixel[]> = signal([]);
  ledStripY: WritableSignal<LedPixel[]> = signal([]);
  ledStripYY: WritableSignal<LedPixel[]> = signal([]);
  
  // --- Alexa State ---
  alexaDevices: WritableSignal<AlexaDevice[]> = signal([]);
  alexaAnnouncements: WritableSignal<AlexaAnnouncement[]> = signal([]);
  
  // --- Module State ---
  installedModules: WritableSignal<Module[]> = signal([]);
}