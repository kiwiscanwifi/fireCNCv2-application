/**
 * @file src/services/config-management.service.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * New service to orchestrate all configuration changes. Components stage their
 * updates here, and this service commits them in a single, atomic save operation.
 */
import { Injectable, inject } from '@angular/core';
import { ConfigFileService } from './config-file.service';
import { StateService, SshConfig, SystemConfig, LedsConfig, AlexaConfig, ServosConfig, TableConfig, StorageMonitoringConfig, NetworkConfig, WifiConfig } from './state.service';
import { InternetMonitoringConfig } from './config-file.service';
import { SnmpConfig } from './snmp-config.service';
import { DigitalOutputConfig, DigitalInputConfig, DashboardLayout } from './dashboard-settings.service';
import { BackupService } from './backup.service';

@Injectable({
  providedIn: 'root',
})
export class ConfigManagementService {
  private configFileService = inject(ConfigFileService);
  private stateService = inject(StateService);
  private backupService = inject(BackupService);

  private pendingConfig: any | null = null;

  private getBuildConfig(): any {
    // If there's a pending config, use it as the base for the next change.
    // Otherwise, create a fresh copy from the current master config file content.
    if (this.pendingConfig) {
      return this.pendingConfig;
    }
    // Create a deep copy to avoid direct mutation of the source of truth.
    return JSON.parse(this.configFileService.configFileContent());
  }

  // --- Methods to stage updates for each configuration slice ---

  public updateRemoteConfig(config: { ENABLED: boolean; URL: string | null }): void {
    const currentConfig = this.getBuildConfig();
    currentConfig.REMOTE = config;
    this.pendingConfig = currentConfig;
  }

  public updateSshConfig(config: SshConfig): void {
    const currentConfig = this.getBuildConfig();
    // Exclude password from being written to config file if it's not being changed.
    const sshToSave: Partial<SshConfig> = { ...config };
    delete sshToSave.PASSWORD;
    currentConfig.SSH = sshToSave;
    this.pendingConfig = currentConfig;
  }

  public updateSystemConfig(config: SystemConfig): void {
    const currentConfig = this.getBuildConfig();
    currentConfig.SYSTEM = config;
    this.pendingConfig = currentConfig;
  }
  
  public updateLedsConfig(config: LedsConfig): void {
    const currentConfig = this.getBuildConfig();
    currentConfig.LEDS = config;
    this.pendingConfig = currentConfig;
  }
  
  public updateAlexaConfig(config: AlexaConfig): void {
    const currentConfig = this.getBuildConfig();
    currentConfig.ALEXA = config;
    this.pendingConfig = currentConfig;
  }

  public updateServosConfig(config: ServosConfig): void {
    const currentConfig = this.getBuildConfig();
    currentConfig.SERVOS = config;
    this.pendingConfig = currentConfig;
  }
  
  public updateTableConfig(config: TableConfig): void {
    const currentConfig = this.getBuildConfig();
    currentConfig.TABLE = config;
    this.pendingConfig = currentConfig;
  }

  public updateStorageMonitoringConfig(config: StorageMonitoringConfig): void {
    const currentConfig = this.getBuildConfig();
    currentConfig.STORAGE_MONITORING = config;
    this.pendingConfig = currentConfig;
  }

  public updateInternetMonitoringConfig(config: InternetMonitoringConfig): void {
    const currentConfig = this.getBuildConfig();
    currentConfig.INTERNET_MONITORING = config;
    this.pendingConfig = currentConfig;
  }

  public updateNetworkConfig(config: NetworkConfig): void {
    const currentConfig = this.getBuildConfig();
    currentConfig.NETWORK = config;
    this.pendingConfig = currentConfig;
  }
  
  public updateWifiConfig(config: WifiConfig): void {
    const currentConfig = this.getBuildConfig();
    currentConfig.WIFI = config;
    this.pendingConfig = currentConfig;
  }
  
  public updateSnmpConfig(config: SnmpConfig): void {
    const currentConfig = this.getBuildConfig();
    currentConfig.SNMP = config;
    this.pendingConfig = currentConfig;
  }
  
  public updateDigitalOutputsConfig(config: DigitalOutputConfig[]): void {
    const currentConfig = this.getBuildConfig();
    currentConfig.DASHBOARD_WIDGETS.DIGITAL_OUTPUTS_CONFIG = config;
    this.pendingConfig = currentConfig;
  }
  
  public updateDigitalInputsConfig(config: DigitalInputConfig[]): void {
    const currentConfig = this.getBuildConfig();
    currentConfig.DASHBOARD_WIDGETS.DIGITAL_INPUTS_CONFIG = config;
    this.pendingConfig = currentConfig;
  }
  
  public updateDashboardLayout(layout: DashboardLayout): void {
    const currentConfig = this.getBuildConfig();
    currentConfig.DASHBOARD_LAYOUT = layout;
    this.pendingConfig = currentConfig;
  }

  /**
   * Commits all staged changes to the configuration file.
   * @param showNotification Whether to display a global success notification.
   * @returns A promise that resolves to true if the save was successful, false otherwise.
   */
  public async commitChanges(showNotification: boolean = true): Promise<boolean> {
    if (!this.pendingConfig) {
      console.warn('CommitChanges called, but no pending changes to save.');
      return true; // No changes to commit, so operation is vacuously successful.
    }

    try {
      // Increment version before saving
      const currentVersion = Number(this.pendingConfig.VERSION) || 0;
      this.pendingConfig.VERSION = currentVersion + 1;

      const success = await this.configFileService.saveConfig(JSON.stringify(this.pendingConfig, null, 2), showNotification);
      
      if (success) {
        this.backupService.createBackup(false);
      }

      return success;
    } finally {
      // Always clear the pending config after the commit attempt.
      this.pendingConfig = null;
    }
  }

  /**
   * Discards any pending configuration changes.
   */
  public discardChanges(): void {
    if (this.pendingConfig) {
      this.pendingConfig = null;
      console.log('Pending configuration changes have been discarded.');
    }
  }
}
