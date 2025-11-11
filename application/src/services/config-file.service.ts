import { Injectable, signal, WritableSignal, inject, Injector } from '@angular/core';
import { PersistenceService } from './persistence.service';
import { StateService, SshConfig, SystemConfig, NetworkConfig, WifiConfig, LedsConfig, AlexaConfig, ServosConfig, TableConfig, StorageMonitoringConfig, LedsState } from './state.service';
import { SnmpConfig } from './snmp-config.service';
import { DashboardSettingsService, DashboardLayout, DigitalOutputConfig, DigitalInputConfig, AnalogInputConfig, DEFAULT_LAYOUT, DEFAULT_DIGITAL_OUTPUTS, DEFAULT_DIGITAL_INPUTS, DEFAULT_ANALOG_INPUTS, DashboardWidget } from './dashboard-settings.service';
import { NotificationService } from './notification.service';
// FIX: Import InternetConnectivityService to update its state
import { InternetConnectivityService } from './internet-connectivity.service';

// FIX: Add and export missing interfaces
export interface RemoteConfigSettings {
  enabled: boolean;
  url: string | null;
}

export interface InternetMonitoringConfig {
  PING_ENABLED: boolean;
  PING_TARGET: string;
}

export interface GeneralSettingsPayload {
  remote: { ENABLED: boolean; URL: string | null };
  ssh: SshConfig;
  system: SystemConfig;
  leds: LedsConfig;
  alexa: AlexaConfig;
  servos: ServosConfig;
  table: TableConfig;
  storage: StorageMonitoringConfig;
  internetMonitoring: InternetMonitoringConfig;
}

export interface OnboardIoSettingsPayload {
  outputsConfig: DigitalOutputConfig[];
  inputsConfig: DigitalInputConfig[];
  digitalOutputsWidgetTitle: string;
  digitalInputsWidgetTitle: string;
}


@Injectable({
  providedIn: 'root'
})
export class ConfigFileService {
  private persistenceService = inject(PersistenceService);
  private stateService = inject(StateService);
  private dashboardSettingsService = inject(DashboardSettingsService);
  private notificationService = inject(NotificationService);
  // FIX: Inject InternetConnectivityService to update its config
  private internetConnectivityService = inject(InternetConnectivityService);
  private injector = inject(Injector);

  private readonly CONFIG_CONTENT_KEY = 'fireCNC_app_config_json';

  configFileContent = this.stateService.configFileContent;
  parseError = this.stateService.parseError;
  
  remoteConfigStatus = this.stateService.remoteConfigStatus;
  // FIX: Add signals for remote config settings
  remoteConfigEnabled = this.stateService.remoteConfigEnabled;
  remoteConfigUrl = this.stateService.remoteConfigUrl;

  lastSavedTimestamp = this.stateService.lastSavedTimestamp;
  configurationVersion = this.stateService.configurationVersion;
  fileSize = this.stateService.fileSize;
  variableCount = this.stateService.variableCount;
  filePath = this.stateService.filePath;


  async initializeConfig() {
    await this.loadConfig();
  }

  private async loadConfig() {
    let configJson = this.persistenceService.getItem<string>(this.CONFIG_CONTENT_KEY);

    if (!configJson) {
        configJson = this.getDefaultConfigAsJson();
        this.persistenceService.setItem(this.CONFIG_CONTENT_KEY, configJson);
    }
    
    // Apply local/default config first to get remote settings
    this.parseAndApplyConfig(configJson);

    // Now attempt to fetch remote if enabled
    if (this.remoteConfigEnabled() && this.remoteConfigUrl()) {
        this.remoteConfigStatus.set('loading');
        try {
            const response = await fetch(this.remoteConfigUrl()!);
            if (!response.ok) throw new Error(`HTTP status ${response.status}`);
            
            const remoteConfigJson = await response.text();
            // Validate JSON before applying
            JSON.parse(remoteConfigJson); 
            
            // If we are here, remote config is valid
            this.parseAndApplyConfig(remoteConfigJson);
            this.persistenceService.setItem(this.CONFIG_CONTENT_KEY, remoteConfigJson);
            this.remoteConfigStatus.set('remote');
            console.log('Successfully loaded remote configuration.');

        } catch (e) {
            console.error('Failed to load or parse remote config. Using local fallback.', e);
            this.remoteConfigStatus.set('error');
        }
    } else {
        this.remoteConfigStatus.set('local');
    }
  }
  
  private parseAndApplyConfig(jsonContent: string) {
    try {
      const config = JSON.parse(jsonContent);

      // Populate StateService
      this.stateService.sshConfig.set(config.SSH);
      this.stateService.watchdogConfig.set(config.SYSTEM);
      this.stateService.networkConfig.set(config.NETWORK);
      this.stateService.wifiConfig.set(config.WIFI);
      this.stateService.ledsConfig.set(config.LEDS);
      this.stateService.alexaConfig.set(config.ALEXA);
      this.stateService.servosConfig.set(config.SERVOS);
      this.stateService.tableConfig.set(config.TABLE);
      this.stateService.storageMonitoringConfig.set(config.STORAGE_MONITORING);
      
      if (config.SNMP) {
        this.stateService.snmpConfig.set(config.SNMP);
      }

      this.stateService.digitalOutputsConfig.set(config.DASHBOARD_WIDGETS.DIGITAL_OUTPUTS_CONFIG);
      this.stateService.digitalInputsConfig.set(config.DASHBOARD_WIDGETS.DIGITAL_INPUTS_CONFIG);
      
      // Populate other services
      this.dashboardSettingsService.setConfig(config.DASHBOARD_LAYOUT, config.DASHBOARD_WIDGETS.ANALOG_INPUTS_CONFIG);

      // FIX: Parse new config sections and update corresponding services/signals
      if (config.REMOTE) {
        this.remoteConfigEnabled.set(config.REMOTE.ENABLED);
        this.remoteConfigUrl.set(config.REMOTE.URL);
      }
      if (config.INTERNET_MONITORING) {
        this.internetConnectivityService.updateConfig(config.INTERNET_MONITORING);
      }

      this.configFileContent.set(jsonContent);
      this.parseError.set(null);

      // Update metadata
      this.configurationVersion.set(Number(config.VERSION) || 0);
      this.fileSize.set(jsonContent.length);
      this.variableCount.set(Object.keys(config).reduce((acc, key) => acc + Object.keys(config[key]).length, 0));
    } catch (e) {
      this.parseError.set('Failed to parse config.json. Check for syntax errors.');
      console.error(e);
    }
  }

  async saveConfig(newContent: string, showNotification: boolean = true): Promise<boolean> {
    try {
      JSON.parse(newContent);
    } catch (e) {
      this.parseError.set('Invalid JSON format. Cannot save.');
      return false;
    }

    this.parseAndApplyConfig(newContent);
    this.persistenceService.setItem(this.CONFIG_CONTENT_KEY, newContent);
    this.lastSavedTimestamp.set(Date.now());
    if (showNotification) {
      this.notificationService.showSuccess('Configuration saved successfully!');
    }
    return true;
  }

  private getDefaultConfigAsJson(): string {
      // Structure containing all default configurations
      const defaultConfig = {
        VERSION: 1,
        // FIX: Add REMOTE and INTERNET_MONITORING sections
        REMOTE: { ENABLED: false, URL: null },
        INTERNET_MONITORING: { PING_ENABLED: true, PING_TARGET: '8.8.8.8' },
        SSH: { ENABLED: true, USERNAME: 'admin', PASSWORD_SET: true },
        SYSTEM: {
          WATCHDOG: true, WATCHDOG_TIMEOUT: 120, WEBSOCKET_URL: 'ws://192.168.1.20/ws',
          FIRMWARE: true, FIRMWARE_TIME: 60, ACCESS_CODE: '0000', TEXT_SELECTION_ENABLED: true,
          BUZZER_ENABLED: true, PIN_SHUTDOWN: 11, WATCHDOG_IP: '192.168.1.1', WATCHDOG_ICMP_DELAY: 60,
          WATCHDOG_ICMP_INTERVAL: 30, WATCHDOG_ICMP_FAIL_COUNT: 3, FAILURE_SD_REBOOT: true,
          FAILURE_SD_REBOOT_TIMEOUT: 120,
          // FIX: Add missing properties
          VOLTAGE_MONITORING_PIN: 3,
          CONFIG_CHANGE_TIMEOUT: 60,
        },
        NETWORK: {
          NTP_SERVER: '192.168.1.1', STATIC_IP: '192.168.1.20', SUBNET: '255.255.255.0',
          GATEWAY_IP: '192.168.1.1', DNS_SERVER: '192.168.1.1', DHCP_SERVER_ENABLED: true,
          DHCP_IP_POOL_START: '192.168.4.100', DHCP_IP_POOL_END: '192.168.4.200',
          AP_IP: '192.168.4.1', AP_SUBNET: '255.255.255.0'
        },
        WIFI: {
          MODE: 'Station', SSID: 'your_ssid', PASSWORD_SET: true, WIFI_AP_SSID: 'fireCNC_AP',
          WIFI_AP_KEY_SET: true, IP_ASSIGNMENT: 'DHCP', STATIC_IP: '192.168.1.21',
          SUBNET: '255.255.255.0', GATEWAY_IP: '192.168.1.1'
        },
        SNMP: this.stateService.snmpConfig(),
        LEDS: {
          COUNT_X: 400, COUNT_Y: 700, COUNT_YY: 700, DEFAULT_BRIGHTNESS_X: 128, DEFAULT_BRIGHTNESS_Y: 128,
          DEFAULT_BRIGHTNESS_YY: 128, IDLE_SERVO_SECONDS: 300, IDLE_SERVO_DIM: 25,
          AXIS_POSITION_DISPLAY: 10, LED_CHASE: true, LED_CHASE_TIMEOUT: 300,
          DYNAMIC_BRIGHTNESS_ENABLED: true,
          MAX_POWER_CONSUMPTION: 200,
          POWER_WARNING_THRESHOLD: 5
        },
        ALEXA: {
          ENABLED: true, ANNOUNCE_DEVICE: 'fireCNC', ONBOARD_LED_DEVICE: 'Onboard LED',
          SYSTEM_BUZZER_DEVICE: 'System Buzzer', LEDX_BRIGHTNESS_DEVICE: 'Gantry LEDs',
          LEDY_BRIGHTNESS_DEVICE: 'Left Rail LEDs', LEDYY_BRIGHTNESS_DEVICE: 'Right Rail LEDs',
          SHUTDOWN_DEVICE: 'Shutdown', CHASE_EFFECT_DEVICE: 'Chase Effect',
          ANNOUNCE_BANNERS_ENABLED: false,
          ANNOUNCEMENT_TYPES: [
            { key: 'power_on', description: 'Device Power On', enabled: true }
          ]
        },
        SERVOS: { SLAVE_ID_X: 3, SLAVE_ID_Y: 1, SLAVE_ID_YY: 2, SLAVE_ID_Z: 4 },
        TABLE: { RAIL_X: 2000, RAIL_Y: 3000, RAIL_Z: 200 },
        STORAGE_MONITORING: { SD_CARD_THRESHOLD: 80, LOCAL_STORAGE_THRESHOLD: 80, SRAM_THRESHOLD: 80, EEPROM_THRESHOLD: 80 },
        DASHBOARD_LAYOUT: DEFAULT_LAYOUT,
        DASHBOARD_WIDGETS: {
          DIGITAL_OUTPUTS_CONFIG: DEFAULT_DIGITAL_OUTPUTS,
          DIGITAL_INPUTS_CONFIG: DEFAULT_DIGITAL_INPUTS,
          ANALOG_INPUTS_CONFIG: DEFAULT_ANALOG_INPUTS
        }
      };
      return JSON.stringify(defaultConfig, null, 2);
  }
}