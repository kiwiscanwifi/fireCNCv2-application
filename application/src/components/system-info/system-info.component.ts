/**
 * @file src/components/system-info/system-info.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for displaying system information like firmware version, uptime, IP address,
 * and SD card status. Also provides controls for features like the onboard buzzer.
 */
import { ChangeDetectionStrategy, Component, computed, Signal, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArduinoService, SystemInfo, SdCardInfo, LedState } from '../../services/arduino.service';
import { SnmpConfigService } from '../../services/snmp-config.service';
import { PersistenceService, StorageUsage } from '../../services/persistence.service';
import { SnmpService, SramInfo, EepromInfo } from '../../services/snmp.service';
import { AlexaService } from '../../services/alexa.service';

@Component({
  selector: 'app-system-info',
  templateUrl: './system-info.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class SystemInfoComponent {
  private arduinoService = inject(ArduinoService);
  private snmpConfigService = inject(SnmpConfigService);
  private persistenceService = inject(PersistenceService);
  private snmpService = inject(SnmpService);
  private alexaService = inject(AlexaService);
  
  systemInfo: Signal<SystemInfo> = this.arduinoService.systemInfo;
  sdCardInfo: Signal<SdCardInfo> = this.arduinoService.sdCardInfo;
  
  sdCardUsagePercent: Signal<number> = computed(() => {
    const info = this.sdCardInfo();
    if (info.totalGb === 0) return 0;
    return (info.usedGb / info.totalGb) * 100;
  });

  isAgentEnabled: Signal<boolean> = computed(() => this.snmpConfigService.config().AGENT_ENABLED);
  isTrapsEnabled: Signal<boolean> = computed(() => this.snmpConfigService.config().TRAPS_ENABLED);
  isAlexaEnabled: Signal<boolean> = this.alexaService.isAlexaEnabled;

  localStorageUsage: Signal<StorageUsage> = signal(this.persistenceService.getLocalStorageUsage());

  localStorageUsagePercent: Signal<number> = computed(() => {
    const usage = this.localStorageUsage();
    if (usage.totalBytes === 0) return 0;
    return (usage.usedBytes / usage.totalBytes) * 100;
  });

  localStorageUsedKb: Signal<string> = computed(() => {
      const usage = this.localStorageUsage();
      return (usage.usedBytes / 1024).toFixed(2);
  });

  localStorageTotalMb: Signal<string> = computed(() => {
      const usage = this.localStorageUsage();
      return (usage.totalBytes / 1024 / 1024).toFixed(1);
  });

  sramInfo: Signal<SramInfo> = this.snmpService.sramInfo;
  sramUsedPercent: Signal<number> = this.snmpService.sramUsedPercent;
  eepromInfo: Signal<EepromInfo> = this.snmpService.eepromInfo;
  eepromUsedPercent: Signal<number> = this.snmpService.eepromUsedPercent;
}