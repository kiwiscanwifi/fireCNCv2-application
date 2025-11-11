import { Injectable, signal, WritableSignal, inject } from '@angular/core';
import { PersistenceService } from './persistence.service';

export interface Backup {
  version: number;
  key: string;
}

@Injectable({
  providedIn: 'root',
})
export class BackupService {
  private persistenceService = inject(PersistenceService);

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
}
