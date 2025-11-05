/**
 * @file src/services/snmp.service.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * A service that simulates fetching SNMP data from the device. It provides signals
 * for various system metrics like voltage, temperature, servo positions, and health stats.
 *
 * @changelog
 * 2024-08-06:
 * - Updated default SRAM to 8MB to match ESP32-S3 hardware.
 */
import { Injectable, signal, WritableSignal, OnDestroy, computed, Signal, effect, inject } from '@angular/core';
import { ArduinoService, SdCardInfo, HealthStats } from './arduino.service';
import { PersistenceService, StorageUsage } from './persistence.service';
import { WebSocketService } from './websocket.service';
import { SnmpConfigService } from './snmp-config.service';

export interface ServoPositions {
  x: number;
  y: number;
  yy: number;
}

export interface ServoLimits {
  x_min: boolean;
  x_max: boolean;
  y_min: boolean;
  y_max: boolean;
  yy_min: boolean;
  yy_max: boolean;
}

export interface SramInfo {
  totalKb: number;
  usedKb: number;
  freeKb: number;
  largestFreeBlockKb: number;
}

export interface EepromInfo {
  totalBytes: number;
  usedBytes: number;
}

@Injectable({
  providedIn: 'root',
})
export class SnmpService implements OnDestroy {
  private arduinoService = inject(ArduinoService);
  private persistenceService = inject(PersistenceService);
  private snmpConfigService = inject(SnmpConfigService);
  
  private updateInterval: any;
  private storageAlerts: { [key: string]: boolean } = {
    sdCard: false,
    localStorage: false,
    sram: false,
    eeprom: false
  };

  // Signals for simulated SNMP data
  adcVoltage: WritableSignal<number> = signal(3.3);
  temperature: WritableSignal<number> = signal(25.0);
  healthStats: Signal<HealthStats> = this.arduinoService.healthStats;
  sramInfo: WritableSignal<SramInfo> = signal({ totalKb: 8192.0, usedKb: 3200.0, freeKb: 4992.0, largestFreeBlockKb: 3840.0 });
  eepromInfo: WritableSignal<EepromInfo> = signal({ totalBytes: 512, usedBytes: 128 });
  analogInputs: WritableSignal<number[]> = signal([1024, 2048, 3072, 4095]);
  
  // Data derived from ArduinoService
  uptime: Signal<string> = computed(() => this.arduinoService.systemInfo().uptime);
  sdCardInfo: Signal<SdCardInfo> = this.arduinoService.sdCardInfo;

  sdCardAvailableGb: Signal<number> = computed(() => {
      const info = this.sdCardInfo();
      return parseFloat((info.totalGb - info.usedGb).toFixed(2));
  });

  sdCardPercentFree: Signal<number> = computed(() => {
      const info = this.sdCardInfo();
      if (info.totalGb === 0) return 0;
      return parseFloat(( (info.totalGb - info.usedGb) / info.totalGb * 100).toFixed(2));
  });

  // Computed signals for SRAM, local storage, and EEPROM
  sramUsedPercent: Signal<number> = computed(() => {
      const info = this.sramInfo();
      if (info.totalKb === 0) return 0;
      return parseFloat(((info.usedKb / info.totalKb) * 100).toFixed(1));
  });

  sramFragmentationPercent: Signal<number> = computed(() => {
      const info = this.sramInfo();
      if (info.freeKb === 0) return 0;
      // Fragmentation is 1 - (largest_block / total_free)
      const fragmentation = 1 - (info.largestFreeBlockKb / info.freeKb);
      return parseFloat((fragmentation * 100).toFixed(1));
  });

  localStorageUsage: Signal<StorageUsage> = signal(this.persistenceService.getLocalStorageUsage());
  
  localStorageUsedMb: Signal<number> = computed(() => {
      const usage = this.localStorageUsage();
      return parseFloat((usage.usedBytes / 1024 / 1024).toFixed(3));
  });

  localStorageAvailableMb: Signal<number> = computed(() => {
      const usage = this.localStorageUsage();
      const availableBytes = usage.totalBytes - usage.usedBytes;
      return parseFloat((availableBytes / 1024 / 1024).toFixed(2));
  });

  localStoragePercentFree: Signal<number> = computed(() => {
      const usage = this.localStorageUsage();
      if (usage.totalBytes === 0) return 0;
      const availableBytes = usage.totalBytes - usage.usedBytes;
      return parseFloat(((availableBytes / usage.totalBytes) * 100).toFixed(2));
  });

  eepromAvailableBytes: Signal<number> = computed(() => {
      const info = this.eepromInfo();
      return info.totalBytes - info.usedBytes;
  });

  eepromUsedPercent: Signal<number> = computed(() => {
      const info = this.eepromInfo();
      if (info.totalBytes === 0) return 0;
      return parseFloat(((info.usedBytes / info.totalBytes) * 100).toFixed(1));
  });

  eepromPercentFree: Signal<number> = computed(() => {
      const info = this.eepromInfo();
      if (info.totalBytes === 0) return 0;
      const available = info.totalBytes - info.usedBytes;
      return parseFloat(((available / info.totalBytes) * 100).toFixed(1));
  });
  
  constructor() {
    // Effect to control the simulation based on config
    effect(() => {
        const config = this.snmpConfigService.config();
        if (config.AGENT_ENABLED) {
            this.startDataSimulation();
        } else {
            this.stopDataSimulation();
        }
    });

    // Effect to check storage usage
    effect(() => {
      const storageConfig = this.arduinoService.storageMonitoringConfig();
      const sdInfo = this.sdCardInfo();
      const lsUsage = this.localStorageUsage();

      const sdUsed = sdInfo.totalGb > 0 ? (sdInfo.usedGb / sdInfo.totalGb) * 100 : 0;
      const localStorageUsed = lsUsage.totalBytes > 0 ? (lsUsage.usedBytes / lsUsage.totalBytes) * 100 : 0;
      const sramUsed = this.sramUsedPercent();
      const eepromUsed = this.eepromUsedPercent();
      
      this.checkStorageUsage('sdCard', sdUsed, storageConfig.SD_CARD_THRESHOLD, `SD Card usage is at ${sdUsed.toFixed(1)}%`);
      this.checkStorageUsage('localStorage', localStorageUsed, storageConfig.LOCAL_STORAGE_THRESHOLD, `Local Storage usage is at ${localStorageUsed.toFixed(1)}%`);
      this.checkStorageUsage('sram', sramUsed, storageConfig.SRAM_THRESHOLD, `SRAM usage is at ${sramUsed.toFixed(1)}%`);
      this.checkStorageUsage('eeprom', eepromUsed, storageConfig.EEPROM_THRESHOLD, `EEPROM usage is at ${eepromUsed.toFixed(1)}%`);
    });
  }

  ngOnDestroy() {
    this.stopDataSimulation();
  }

  /**
   * Simulates a watchdog reboot event by calling the main logic in ArduinoService.
   */
  triggerWatchdogReboot(): void {
    this.arduinoService.incrementWatchdogRebootsAndReboot();
  }

  private checkStorageUsage(deviceKey: string, usagePercent: number, threshold: number, message: string): void {
    if (usagePercent > threshold && !this.storageAlerts[deviceKey]) {
      this.storageAlerts[deviceKey] = true; // Mark as alerted
      this.snmpConfigService.sendTrap(`High Storage Usage: ${message}.`);

      // Blink onboard LED
      const originalLedState = this.arduinoService.onboardLed();
      this.arduinoService.onboardLed.set({ color: '#FF0000', flashing: true, brightness: 255 });
      setTimeout(() => {
        // Only restore if it hasn't been changed by something else
        if (this.arduinoService.onboardLed().color === '#FF0000') {
            this.arduinoService.onboardLed.set(originalLedState);
        }
      }, 20000); // Blink for 20 seconds
    } else if (usagePercent <= threshold && this.storageAlerts[deviceKey]) {
      // Reset alert status when usage goes back to normal
      this.storageAlerts[deviceKey] = false;
    }
  }

  private startDataSimulation() {
    if (this.updateInterval) {
      return; // Interval is already running
    }
    this.updateInterval = setInterval(() => {
      // Simulate ADC voltage fluctuation
      this.adcVoltage.update(v => parseFloat((v + (Math.random() - 0.5) * 0.02).toFixed(3)));

      // Simulate temperature fluctuation
      this.temperature.update(t => parseFloat((t + (Math.random() - 0.5) * 0.1).toFixed(2)));

      // Simulate SRAM usage fluctuation
      this.sramInfo.update(sram => {
          // Simulate some memory allocation/deallocation
          const fluctuationKb = (Math.random() - 0.45) * 5; // Fluctuate by up to ~5KB, tends to increase
          let newUsedKb = sram.usedKb + fluctuationKb;

          // Clamp usage to be within reasonable bounds (e.g., 20% to 90% of total)
          newUsedKb = Math.max(sram.totalKb * 0.2, Math.min(sram.totalKb * 0.9, newUsedKb));
          
          const newFreeKb = sram.totalKb - newUsedKb;
          
          // Simulate fragmentation. Largest block is always smaller than or equal to total free space.
          // Let's say fragmentation makes it so the largest block is between 70% and 98% of the free space.
          const fragmentationFactor = 0.7 + Math.random() * 0.28;
          let newLargestFreeBlockKb = newFreeKb * fragmentationFactor;
          
          // The largest free block can't be larger than the total free space.
          newLargestFreeBlockKb = Math.min(newFreeKb, newLargestFreeBlockKb);

          return {
            totalKb: sram.totalKb,
            usedKb: parseFloat(newUsedKb.toFixed(1)),
            freeKb: parseFloat(newFreeKb.toFixed(1)),
            largestFreeBlockKb: parseFloat(newLargestFreeBlockKb.toFixed(1)),
          };
      });

      // Simulate EEPROM usage fluctuation
      this.eepromInfo.update(eeprom => {
        // Simulate small writes/updates to EEPROM, happening less frequently
        const fluctuation = Math.random() > 0.8 ? (Math.random() - 0.5) * 10 : 0;
        let newUsedBytes = eeprom.usedBytes + fluctuation;

        // Clamp usage
        newUsedBytes = Math.max(0, Math.min(eeprom.totalBytes, newUsedBytes));

        return {
          totalBytes: eeprom.totalBytes,
          usedBytes: Math.round(newUsedBytes),
        };
      });

      // Simulate Analog Input fluctuation
      this.analogInputs.update(values => {
        return values.map(v => {
            let newVal = v + (Math.random() - 0.5) * 50;
            return Math.max(0, Math.min(4095, Math.round(newVal)));
        });
      });

    }, 2000); // Update every 2 seconds
  }

  private stopDataSimulation() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}