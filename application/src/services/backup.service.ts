/**
 * @file src/services/backup.service.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * A service for persisting and retrieving data from the browser's localStorage.
 * This acts as a simple non-volatile memory for the web application.
 */
import { Injectable, signal, WritableSignal, inject } from '@angular/core';
import { PersistenceService } from './persistence.service';
import { ConfigFileService } from './config-file.service';
import { NotificationService } from './notification.service';

export interface Backup {
  version: number;
  key: string;
}

@Injectable({
  providedIn: 'root',
})
export class BackupService {
  private persistenceService = inject(PersistenceService);
  private configFileService = inject(ConfigFileService);
  private notificationService = inject(NotificationService);

  private readonly BACKUP_PREFIX = 'fireCNC_backup_firecnc.conf.';
  
  backups: WritableSignal<Backup[]> = signal([]);

  constructor() {
    this.loadBackups();
  }

  private loadBackups(): void {
    const backupKeys = this.persistenceService.getKeys(this.BACKUP_PREFIX);
    const backups: Backup[] = backupKeys
      .map(key => {
        const versionStr = key.replace(this.BACKUP_PREFIX, '');
        const version = parseInt(versionStr, 10);
        if (isNaN(version)) {
          return null;
        }
        return { version, key };
      })
      .filter((b): b is Backup => b !== null)
      .sort((a, b) => b.version - a.version); // Sort descending by version number

    this.backups.set(backups);
  }

  getBackupContent(key: string): string | null {
    return this.persistenceService.getItem<string>(key);
  }

  createBackup(showNotification: boolean = true): void {
    const currentBackups = this.backups();
    // Find the highest version number, or start at 0 if no backups exist.
    const latestVersion = currentBackups.length > 0 ? currentBackups[0].version : 0;
    const newVersion = latestVersion + 1;
    const newBackupKey = `${this.BACKUP_PREFIX}${newVersion}`;

    const currentConfigContent = this.configFileService.configFileContent();
    
    try {
      // Just validate it's valid JSON before saving.
      JSON.parse(currentConfigContent);
      const backupContent = currentConfigContent;

      this.persistenceService.setItem(newBackupKey, backupContent);
      console.log(`Created backup ${newBackupKey}`);
      
      // Refresh the list of backups
      this.loadBackups();
      
      if (showNotification) {
        this.notificationService.showSuccess(`Backup Version ${newVersion} created successfully.`);
      }
    } catch (e) {
      console.error("Failed to create backup because current config is invalid JSON.", e);
      if (showNotification) {
        this.notificationService.showError("Failed to create backup: Current config is invalid.");
      }
    }
  }
}
