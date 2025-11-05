/**
 * @file src/components/storage-info/storage-info.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for displaying storage usage information.
 */
import { ChangeDetectionStrategy, Component, computed, Signal, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArduinoService, SdCardInfo } from '../../services/arduino.service';
import { PersistenceService, StorageUsage } from '../../services/persistence.service';
import { SnmpService, EepromInfo } from '../../services/snmp.service';

@Component({
  selector: 'app-storage-info',
  imports: [CommonModule],
  templateUrl: './storage-info.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorageInfoComponent {
  private arduinoService = inject(ArduinoService);
  private persistenceService = inject(PersistenceService);
  private snmpService = inject(SnmpService);
  
  sdCardInfo: Signal<SdCardInfo> = this.arduinoService.sdCardInfo;
  
  sdCardUsagePercent: Signal<number> = computed(() => {
    const info = this.sdCardInfo();
    if (info.totalGb === 0) return 0;
    return (info.usedGb / info.totalGb) * 100;
  });

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

  eepromInfo: Signal<EepromInfo> = this.snmpService.eepromInfo;
  eepromUsedPercent: Signal<number> = this.snmpService.eepromUsedPercent;
}
