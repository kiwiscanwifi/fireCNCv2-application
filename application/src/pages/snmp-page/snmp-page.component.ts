import { ChangeDetectionStrategy, Component, Signal, signal, computed, inject, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SnmpService, SramInfo, EepromInfo } from '../../services/snmp.service';
import { ArduinoService, SdCardInfo, HealthStats } from '../../services/arduino.service';
import { SnmpConfigService } from '../../services/snmp-config.service';
import { ServoControlService } from '../../services/servo-control.service';
import { ServoPositions, ServoLimits } from '../../services/snmp.service';
import { DashboardSettingsService } from '../../services/dashboard-settings.service';
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

  adcVoltage: Signal<number> = this.snmpService.adcVoltage;
  temperature: Signal<number> = this.snmpService.temperature;
  uptime: Signal<string> = this.snmpService.uptime;
  sdCardInfo: Signal<SdCardInfo> = this.arduinoService.sdCardInfo;
  sdCardAvailableGb: Signal<number> = this.snmpService.sdCardAvailableGb;
  sdCardPercentFree: Signal<number> = this.snmpService.sdCardPercentFree;
  healthStats: Signal<HealthStats> = this.snmpService.healthStats;
  isAgentEnabled: Signal<boolean> = computed(() => this.snmpConfigService.config().AGENT_ENABLED);
  displayOid: Signal<boolean> = computed(() => this.snmpConfigService.config().DISPLAY_OID_ON_STATUS_PAGE);

  // NEW: Signals for copied OID feedback
  copiedOid: WritableSignal<string | null> = signal(null);
  private copiedOidTimeout: any;

  private digitalOutputsState: Signal<boolean[]> = this.arduinoService.digitalOutputs;
  // Fetch from ArduinoService instead of DashboardSettingsService
  private digitalOutputsConfig = this.arduinoService.digitalOutputsConfig;

  visibleDigitalOutputs = computed(() => {
    const outputsState = this.digitalOutputsState();
    // Invoke the signal to get its value
    const outputsConfig = this.digitalOutputsConfig();
    
    return outputsConfig
      .filter(config => config.enabled)
      .map(config => ({
        id: config.id,
        name: config.name,
        state: outputsState[config.id]
      }));
  });

  private digitalInputsState: Signal<boolean[]> = this.arduinoService.digitalInputs;
  // Fetch from ArduinoService instead of DashboardSettingsService
  private digitalInputsConfig = this.arduinoService.digitalInputsConfig;
  
  visibleDigitalInputs = computed(() => {
    const inputsState = this.digitalInputsState();
    // Invoke the signal to get its value
    const inputsConfig = this.digitalInputsConfig();
    
    return inputsConfig
      .filter(config => config.enabled)
      .map(config => ({
        id: config.id,
        name: config.name,
        state: inputsState[config.id]
      }));
  });

  servoPositions: Signal<ServoPositions> = computed(() => ({
    x: Math.round(this.servoControlService.servoX().position),
    y: Math.round(this.servoControlService.servoY().position),
    yy: Math.round(this.servoControlService.servoYY().position),
  }));

  servoLimits: Signal<ServoLimits> = computed(() => ({
    x_min: this.servoControlService.servoX().limitMin,
    x_max: this.servoControlService.servoX().limitMax,
    y_min: this.servoControlService.servoY().limitMin,
    y_max: this.servoControlService.servoY().limitMax,
    yy_min: this.servoControlService.servoYY().limitMin,
    yy_max: this.servoControlService.servoYY().limitMax,
  }));

  // SRAM signals
  sramInfo: Signal<SramInfo> = this.snmpService.sramInfo;
  sramUsedPercent: Signal<number> = this.snmpService.sramUsedPercent;
  sramFragmentationPercent: Signal<number> = this.snmpService.sramFragmentationPercent;

  // Local Storage signals
  localStorageUsedMb: Signal<number> = this.snmpService.localStorageUsedMb;
  localStorageAvailableMb: Signal<number> = this.snmpService.localStorageAvailableMb;
  localStoragePercentFree: Signal<number> = this.snmpService.localStoragePercentFree;

  // EEPROM signals
  eepromInfo: Signal<EepromInfo> = this.snmpService.eepromInfo;
  eepromAvailableBytes: Signal<number> = this.snmpService.eepromAvailableBytes;
  eepromPercentFree: Signal<number> = this.snmpService.eepromPercentFree;
  
  // Analog Input signals
  private analogInputsConfig = this.dashboardSettingsService.analogInputsConfig;
  private analogInputValues = this.snmpService.analogInputs;

  visibleAnalogInputs = computed(() => {
    const configs = this.analogInputsConfig();
    const values = this.analogInputValues();

    return configs
      .filter(config => config.enabled)
      .map(config => ({
        id: config.id,
        name: config.name,
        value: values[config.id] ?? 0,
        percent: ((values[config.id] ?? 0) / 4095) * 100
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

  /**
   * Toggles the display of OIDs on the status page and persists the change.
   */
  toggleDisplayOid(): void {
    const currentConfig = this.snmpConfigService.config();
    this.snmpConfigService.updateConfig({
      ...currentConfig,
      DISPLAY_OID_ON_STATUS_PAGE: !currentConfig.DISPLAY_OID_ON_STATUS_PAGE,
    });
  }

  /**
   * Copies the given OID string to the clipboard and shows a temporary feedback.
   * @param event The mouse event, to stop propagation.
   * @param oid The OID string to copy.
   */
  async copyOidToClipboard(event: MouseEvent, oid: string): Promise<void> {
    event.stopPropagation(); // Prevent any parent click handlers
    try {
      await navigator.clipboard.writeText(oid);
      this.copiedOid.set(oid);
      clearTimeout(this.copiedOidTimeout);
      this.copiedOidTimeout = setTimeout(() => {
        this.copiedOid.set(null);
      }, 2000); // Clear feedback after 2 seconds
    } catch (err) {
      console.error('Failed to copy OID to clipboard:', err);
      // Optionally show a temporary error message to the user
    }
  }
}