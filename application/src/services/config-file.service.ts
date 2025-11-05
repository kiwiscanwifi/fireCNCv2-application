import { Injectable, signal, WritableSignal, inject, Injector } from '@angular/core';
import { SnmpConfig, SnmpConfigService } from './snmp-config.service';
import { AlexaConfig, ArduinoService, LedsConfig, NetworkConfig, ServosConfig, SshConfig, StorageMonitoringConfig, SystemConfig, TableConfig, WifiConfig } from './arduino.service';
import { AnalogInputConfig, DashboardLayout, DashboardSettingsService, DigitalInputConfig, DigitalOutputConfig, DEFAULT_DIGITAL_OUTPUTS, DEFAULT_DIGITAL_INPUTS } from './dashboard-settings.service'; // FIX: Removed DEFAULT imports as they are now local to dashboard-settings.service.ts // NEW: Import DEFAULT_DIGITAL_OUTPUTS and DEFAULT_DIGITAL_INPUTS
import { InternetConnectivityService } from './internet-connectivity.service'; // NEW: Import
import { PersistenceService } from './persistence.service';

interface LogConfig {
  SNMP_TRAP: string;
  CHANGELOG: string;
}

// NEW: Interface for Internet Monitoring config
export interface InternetMonitoringConfig {
  PING_ENABLED: boolean;
  PING_TARGET: string;
}

// Defines the structure of the entire config.json file
interface AppConfig {
  LOG: LogConfig;
  SNMP: Omit<SnmpConfig, 'TRAP_LOG_PATH'>;
  SSH: SshConfig;
  SYSTEM: SystemConfig;
  NETWORK: NetworkConfig;
  WIFI: WifiConfig;
  LEDS: LedsConfig;
  ALEXA: AlexaConfig;
  SERVOS: ServosConfig;
  TABLE: TableConfig;
  STORAGE_MONITORING: StorageMonitoringConfig;
  DASHBOARD: DashboardLayout;
  DIGITAL_OUTPUTS: DigitalOutputConfig[];
  DIGITAL_INPUTS: DigitalInputConfig[];
  ANALOG_INPUTS: AnalogInputConfig[];
  INTERNET_MONITORING: InternetMonitoringConfig; // NEW: Add to AppConfig
}

@Injectable({
  providedIn: 'root',
})
export class ConfigFileService {
  private snmpConfigService = inject(SnmpConfigService);
  private arduinoService = inject(ArduinoService);
  private internetConnectivityService = inject(InternetConnectivityService); // NEW: Inject
  private injector = inject(Injector);
  private persistenceService = inject(PersistenceService); // NEW: Inject PersistenceService

  private _dashboardSettingsService?: DashboardSettingsService;

  private readonly CONFIG_FILE_KEY = 'fireCNC_app_config_json'; // NEW: Key for storing full config

  // Lazy-loaded to break circular dependency
  private get dashboardSettingsService(): DashboardSettingsService {
    if (!this._dashboardSettingsService) {
      this._dashboardSettingsService = this.injector.get(DashboardSettingsService);
    }
    return this._dashboardSettingsService;
  }
  
  configFileContent: WritableSignal<string> = signal('');
  parseError: WritableSignal<string | null> = signal(null);

  constructor() {
    // The constructor is now empty. Initialization is deferred to initializeConfig()
  }

  public initializeConfig(): void {
    let loadedConfig: AppConfig | null = null;
    try {
      const storedConfigString = this.persistenceService.getItem<string>(this.CONFIG_FILE_KEY);
      if (storedConfigString) {
        loadedConfig = JSON.parse(storedConfigString);
        this.parseError.set(null);
      }
    } catch (e: any) {
      this.parseError.set(`Failed to parse stored config: ${e.message}`);
      console.error('Error parsing stored config:', e);
      // Fallback to defaults if stored config is corrupt
    }

    // Default configuration (same structure as AppConfig)
    const defaultConfig: AppConfig = {
      LOG: {
        SNMP_TRAP: '/logs/snmp_trap.log',
        CHANGELOG: '/logs/changelog.log',
      },
      SNMP: {
        TRAP_TARGET: '0.0.0.0',
        TRAP_PORT: 162,
        TRAP_COMMUNITY: 'SNMP_trap',
        TRAP_PROTOCOL: 'UDP',
        COMMUNITY: 'public',
        PORT: 161,
        PROTOCOL: 'UDP',
        TRAP_LEVEL: 'ERROR',
        TRAPS_ENABLED: true,
        AGENT_ENABLED: true,
        DISPLAY_OID_ON_STATUS_PAGE: false, // Changed from true to false
      },
      SSH: { ENABLED: true, USERNAME: 'admin', PASSWORD: 'password' },
      SYSTEM: {
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
        ACCESS_CODE: '0000', // Default access code
      },
      NETWORK: {
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
      },
      WIFI: { 
        MODE: 'Station', // MODIFIED
        SSID: 'your_ssid', 
        PASSWORD: 'your_password',
        WIFI_AP_SSID: 'fireCNC_AP', 
        WIFI_AP_KEY: 'admin123',
        IP_ASSIGNMENT: 'DHCP', // NEW
        STATIC_IP: '192.168.1.21', // NEW
        SUBNET: '255.255.255.0', // NEW
        GATEWAY_IP: '192.168.1.1', // NEW
      },
      LEDS: {
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
      },
      ALEXA: {
        ENABLED: true,
        ANNOUNCE_DEVICE: 'fireCNC',
        ONBOARD_LED_DEVICE: 'Onboard LED',
        SYSTEM_BUZZER_DEVICE: 'System Buzzer',
        LEDX_BRIGHTNESS_DEVICE: 'LEDX Brightness',
        LEDY_BRIGHTNESS_DEVICE: 'LEDY Brightness',
        LEDYY_BRIGHTNESS_DEVICE: 'LEDYY Brightness',
        SHUTDOWN_DEVICE: 'System Shutdown',
        CHASE_EFFECT_DEVICE: 'Chase Effect',
      },
      SERVOS: { SLAVE_ID_X: 3, SLAVE_ID_Y: 1, SLAVE_ID_YY: 2 },
      TABLE: { RAIL_X: 2000, RAIL_Y: 3000 },
      STORAGE_MONITORING: {
        SD_CARD_THRESHOLD: 80,
        LOCAL_STORAGE_THRESHOLD: 80,
        SRAM_THRESHOLD: 80,
        EEPROM_THRESHOLD: 80,
      },
      DASHBOARD: this.dashboardSettingsService.getDefaultLayout(),
      DIGITAL_OUTPUTS: this.dashboardSettingsService.getDefaultDigitalOutputs(),
      DIGITAL_INPUTS: this.dashboardSettingsService.getDefaultDigitalInputs(),
      ANALOG_INPUTS: this.dashboardSettingsService.getDefaultAnalogInputs(),
      INTERNET_MONITORING: {
        PING_ENABLED: true,
        PING_TARGET: '8.8.8.8',
      },
    };

    // Merge loaded config with defaults, ensuring all properties are present
    const finalConfig: AppConfig = this.deepMerge(defaultConfig, loadedConfig || {});

    this.applyConfigToServices(finalConfig);
    this.configFileContent.set(JSON.stringify(finalConfig, null, 2));
    this.arduinoService.triggerBeep(1); // Short beep on successful config load
  }

  /**
   * Applies the provided configuration to relevant services.
   * This is the central point for updating all application state from the config.
   */
  private applyConfigToServices(config: AppConfig): void {
    this.snmpConfigService.updateConfig(config.SNMP);
    this.arduinoService.updateSshConfig(config.SSH);
    this.arduinoService.updateSystemConfig(config.SYSTEM);
    this.arduinoService.updateNetworkAndWifiConfig(config.NETWORK, config.WIFI);
    this.arduinoService.updateLedsConfig(config.LEDS);
    this.arduinoService.updateAlexaConfig(config.ALEXA);
    this.arduinoService.updateServosAndTableConfig(config.SERVOS, config.TABLE);
    this.arduinoService.updateStorageMonitoringConfig(config.STORAGE_MONITORING);
    this.internetConnectivityService.updateConfig(config.INTERNET_MONITORING);
    
    // NEW: Set digital I/O configs directly in ArduinoService
    this.arduinoService.digitalOutputsConfig.set(config.DIGITAL_OUTPUTS);
    this.arduinoService.digitalInputsConfig.set(config.DIGITAL_INPUTS);

    // Dashboard settings depend on other configs, so ensure they are updated after
    // FIX: Removed extra `undefined` arguments that were not part of the setConfig signature.
    this.dashboardSettingsService.setConfig(config.DASHBOARD, config.ANALOG_INPUTS);
  }

  /**
   * Saves the entire configuration back to persistent storage (localStorage).
   * @param content The full JSON content as a string.
   * @returns True if saved successfully, false otherwise.
   */
  public saveConfig(content: string): boolean {
    try {
      const parsedConfig: AppConfig = JSON.parse(content);
      // Validate structure. A simple check for now.
      if (!parsedConfig.SYSTEM || !parsedConfig.SNMP) {
        throw new Error('Invalid config structure: Missing SYSTEM or SNMP section.');
      }
      this.persistenceService.setItem(this.CONFIG_FILE_KEY, content);
      this.applyConfigToServices(parsedConfig); // Apply new config immediately
      this.configFileContent.set(content); // Update internal signal
      this.parseError.set(null); // Clear any previous errors
      return true;
    } catch (e: any) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.parseError.set(`Invalid JSON format or structure: ${errorMessage}`);
      console.error('Error saving config:', e);
      return false;
    }
  }

  /**
   * Updates a partial section of the configuration and saves the entire config.
   * This is used by individual settings components to update their specific parts.
   */
  public updatePartialConfig(key: keyof AppConfig, newPartialConfig: any): boolean {
    const currentConfig = JSON.parse(this.configFileContent());
    const updatedConfig = {
      ...currentConfig,
      [key]: newPartialConfig,
    };
    return this.saveConfig(JSON.stringify(updatedConfig, null, 2));
  }

  // --- Specific Update Methods for Dashboard Layout and Digital I/O ---
  public updateDashboardLayout(newLayout: DashboardLayout): boolean {
    return this.updatePartialConfig('DASHBOARD', newLayout);
  }

  public updateDigitalOutputsConfig(newConfig: DigitalOutputConfig[]): boolean {
    return this.updatePartialConfig('DIGITAL_OUTPUTS', newConfig);
  }

  public updateDigitalInputsConfig(newConfig: DigitalInputConfig[]): boolean {
    return this.updatePartialConfig('DIGITAL_INPUTS', newConfig);
  }

  public updateAnalogInputsConfig(newConfig: AnalogInputConfig[]): boolean {
    return this.updatePartialConfig('ANALOG_INPUTS', newConfig);
  }

  public updateInternetMonitoringConfig(newConfig: InternetMonitoringConfig): boolean {
    return this.updatePartialConfig('INTERNET_MONITORING', newConfig);
  }

  public updateSystemAndSshConfig(systemConfig: SystemConfig, sshConfig: SshConfig): boolean {
    const currentConfig = JSON.parse(this.configFileContent());
    const updatedConfig = {
      ...currentConfig,
      SYSTEM: systemConfig,
      SSH: sshConfig,
    };
    return this.saveConfig(JSON.stringify(updatedConfig, null, 2));
  }

  public updateLedsConfig(ledsConfig: LedsConfig): boolean {
    return this.updatePartialConfig('LEDS', ledsConfig);
  }

  public updateAlexaConfig(alexaConfig: AlexaConfig): boolean {
    return this.updatePartialConfig('ALEXA', alexaConfig);
  }

  public updateServosAndTableConfig(servosConfig: ServosConfig, tableConfig: TableConfig): boolean {
    const currentConfig = JSON.parse(this.configFileContent());
    const updatedConfig = {
      ...currentConfig,
      SERVOS: servosConfig,
      TABLE: tableConfig,
    };
    return this.saveConfig(JSON.stringify(updatedConfig, null, 2));
  }

  public updateStorageMonitoringConfig(storageMonitoringConfig: StorageMonitoringConfig): boolean {
    return this.updatePartialConfig('STORAGE_MONITORING', storageMonitoringConfig);
  }

  public updateNetworkAndWifiConfig(networkConfig: NetworkConfig, wifiConfig: WifiConfig): boolean {
    const currentConfig = JSON.parse(this.configFileContent());
    const updatedConfig = {
      ...currentConfig,
      NETWORK: networkConfig,
      WIFI: wifiConfig,
    };
    return this.saveConfig(JSON.stringify(updatedConfig, null, 2));
  }

  // Generic deep merge utility for config objects
  private deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const output = { ...target };

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const sourceValue = source[key];
        const targetValue = target[key];

        if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue) &&
            targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
          // Recursively merge if both are objects and not arrays
          output[key] = this.deepMerge(targetValue, sourceValue);
        } else {
          // Overwrite for primitives, arrays, or if one is not an object
          output[key] = sourceValue;
        }
      }
    }
    return output;
  }
}