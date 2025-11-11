import { ChangeDetectionStrategy, Component, Signal, signal, computed, inject, WritableSignal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SnmpService, SramInfo, EepromInfo } from '../../services/snmp.service';
import { ArduinoService, SdCardInfo, HealthStats, LedsConfig, LedsState, SnmpConfig, DigitalOutputConfig, DigitalInputConfig } from '../../services/arduino.service';
import { SnmpConfigService } from '../../services/snmp-config.service';
import { ServoControlService } from '../../services/servo-control.service';
import { ServoPositions, ServoLimits } from '../../services/snmp.service';
import { DashboardSettingsService, AnalogInputConfig } from '../../services/dashboard-settings.service';
import { ModuleService } from '../../services/module.service';

@Component({
  selector: 'app-snmp-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './snmp-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SnmpPageComponent {
  private snmpService = inject(SnmpService);
  protected snmpConfigService = inject(SnmpConfigService);
  private servoControlService = inject(ServoControlService);
  private arduinoService = inject(ArduinoService);
  private dashboardSettingsService = inject(DashboardSettingsService);
  private moduleService = inject(ModuleService);

  // FIX: These signals should come from the snmpService, not the arduinoService facade.
  adcVoltage: Signal<number> = this.snmpService.adcVoltage;
  temperature: Signal<number> = this.snmpService.temperature;
  // FIX: Use computed() for signals, not .pipe(map()).
  uptime: Signal<string> = computed(() => this.arduinoService.systemInfo().uptime);
  sdCardInfo: Signal<SdCardInfo> = this.arduinoService.sdCardInfo;
  healthStats: Signal<HealthStats> = this.arduinoService.healthStats;
  // FIX: source snmpConfig from snmpConfigService to ensure consistency with update logic.
  snmpConfig: Signal<SnmpConfig> = this.snmpConfigService.config;
  ledsConfig: Signal<LedsConfig> = this.arduinoService.ledsConfig;
  ledsState: Signal<LedsState> = this.arduinoService.ledsState;
  
  isAgentEnabled: Signal<boolean> = computed(() => this.snmpConfig().AGENT_ENABLED);
  displayOid: Signal<boolean> = computed(() => this.snmpConfig().DISPLAY_OID_ON_STATUS_PAGE);

  // FIX: These computed signals should be sourced from snmpService.
  ledPowerConsumption: Signal<number> = this.snmpService.ledPowerConsumption;
  sdCardAvailableGb: Signal<number> = this.snmpService.sdCardAvailableGb;
  sdCardPercentFree: Signal<number> = this.snmpService.sdCardPercentFree;
  sramUsedPercent: Signal<number> = this.snmpService.sramUsedPercent;
  sramFragmentationPercent: Signal<number> = this.snmpService.sramFragmentationPercent;
  localStorageUsedMb: Signal<number> = this.snmpService.localStorageUsedMb;
  localStorageAvailableMb: Signal<number> = this.snmpService.localStorageAvailableMb;
  localStoragePercentFree: Signal<number> = this.snmpService.localStoragePercentFree;
  eepromAvailableBytes: Signal<number> = this.snmpService.eepromAvailableBytes;
  eepromPercentFree: Signal<number> = this.snmpService.eepromPercentFree;
  sramInfo: Signal<SramInfo> = this.snmpService.sramInfo;
  eepromInfo: Signal<EepromInfo> = this.snmpService.eepromInfo;

  masterBrightnessPercent: Signal<number> = computed(() => {
    return Math.round(this.ledsState().brightness / 2.55);
  });

  // NEW: Signals for copied OID feedback
  copiedOid: WritableSignal<string | null> = signal(null);
  private copiedOidTimeout: any;

  private digitalOutputsState: Signal<boolean[]> = this.arduinoService.digitalOutputs;
  private digitalOutputsConfig: Signal<DigitalOutputConfig[]> = this.arduinoService.digitalOutputsConfig;

  visibleDigitalOutputs = computed(() => {
    const outputsState = this.digitalOutputsState();
    const outputsConfig = this.digitalOutputsConfig();
    
    return outputsConfig
      // FIX: Correct property access from .enabled to .ENABLED
      .filter(config => config.ENABLED)
      .map(config => ({
        // FIX: Correct property access from .id to .ID
        id: config.ID,
        // FIX: Correct property access from .name to .NAME
        name: config.NAME,
        // FIX: Correct property access from .id to .ID
        state: outputsState[config.ID]
      }));
  });

  private digitalInputsState: Signal<boolean[]> = this.arduinoService.digitalInputs;
  private digitalInputsConfig: Signal<DigitalInputConfig[]> = this.arduinoService.digitalInputsConfig;
  
  visibleDigitalInputs = computed(() => {
    const inputsState = this.digitalInputsState();
    const inputsConfig = this.digitalInputsConfig();
    
    return inputsConfig
      // FIX: Correct property access from .enabled to .ENABLED
      .filter(config => config.ENABLED)
      .map(config => ({
        // FIX: Correct property access from .id to .ID
        id: config.ID,
        // FIX: Correct property access from .name to .NAME
        name: config.NAME,
        // FIX: Correct property access from .id to .ID
        state: inputsState[config.ID]
      }));
  });

  servoPositions: Signal<ServoPositions> = computed(() => ({
    x: Math.round(this.servoControlService.servoX().position),
    y: Math.round(this.servoControlService.servoY().position),
    yy: Math.round(this.servoControlService.servoYY().position),
    z: Math.round(this.servoControlService.servoZ().position),
  }));

  servoLimits: Signal<ServoLimits> = computed(() => ({
    x_min: this.servoControlService.servoX().limitMin,
    x_max: this.servoControlService.servoX().limitMax,
    y_min: this.servoControlService.servoY().limitMin,
    y_max: this.servoControlService.servoY().limitMax,
    yy_min: this.servoControlService.servoYY().limitMin,
    yy_max: this.servoControlService.servoYY().limitMax,
    z_min: this.servoControlService.servoZ().limitMin,
    z_max: this.servoControlService.servoZ().limitMax,
  }));
  
  // Analog Input signals
  private analogInputsConfig: Signal<AnalogInputConfig[]> = this.dashboardSettingsService.analogInputsConfig;
  // FIX: Source analog input values from the snmpService
  private analogInputValues = this.snmpService.analogInputs;

  visibleAnalogInputs = computed(() => {
    const configs = this.analogInputsConfig();
    const values = this.analogInputValues();

    return configs
      // FIX: Correct property access from .enabled to .ENABLED
      .filter(config => config.ENABLED)
      .map(config => ({
        // FIX: Correct property access from .id to .ID
        id: config.ID,
        // FIX: Correct property access from .name to .NAME
        name: config.NAME,
        // FIX: Correct property access from .id to .ID
        value: values[config.ID] ?? 0,
        // FIX: Correct property access from .id to .ID
        percent: ((values[config.ID] ?? 0) / 4095) * 100
      }));
  });

  statusPageModules = computed(() => {
    return this.moduleService.installedModules()
      .filter(m => m.displayOnStatusPage)
      .map(m => ({
        ...m,
        enabledPorts: m.ports.filter(p => p.enabled)
      }));
  });

  constructor() {}

  toggleDisplayOid(): void {
    const currentConfig = this.snmpConfig();
    this.snmpConfigService.updateConfig({
      ...currentConfig,
      DISPLAY_OID_ON_STATUS_PAGE: !currentConfig.DISPLAY_OID_ON_STATUS_PAGE,
    }, false); 
  }

  async copyOidToClipboard(event: MouseEvent, oid: string): Promise<void> {
    event.stopPropagation(); 
    try {
      await navigator.clipboard.writeText(oid);
      this.copiedOid.set(oid);
      clearTimeout(this.copiedOidTimeout);
      this.copiedOidTimeout = setTimeout(() => {
        this.copiedOid.set(null);
      }, 2000); 
    } catch (err) {
      console.error('Failed to copy OID to clipboard:', err);
    }
  }
}
