import { ChangeDetectionStrategy, Component, signal, WritableSignal, ElementRef, viewChild, afterNextRender, inject, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BackupService, Backup } from '../../services/backup.service';

declare var CodeMirror: any;

@Component({
  selector: 'app-backup-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './backup.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackupPageComponent {
  private backupService = inject(BackupService);

  backups = this.backupService.backups;
  selectedBackup: WritableSignal<Backup | null> = signal(null);

  editorHost = viewChild<ElementRef<HTMLDivElement>>('editorHost');
  private editor: WritableSignal<any | null> = signal(null);

  selectedBackupContent = computed(() => {
    const backup = this.selectedBackup();
    if (!backup) return 'Select a backup version to view its content.';
    return this.backupService.getBackupContent(backup.key) ?? 'Could not load backup content.';
  });

  constructor() {
    effect(() => {
      const host = this.editorHost();
      if (host && !this.editor()) {
        this.initializeCodeMirror(host);
      }
    });

    // Auto-select the first backup if available, or if the current selection is gone
    effect(() => {
      const backupList = this.backups();
      const currentSelection = this.selectedBackup();
      if (backupList.length > 0 && (!currentSelection || !backupList.find(b => b.key === currentSelection.key))) {
        this.selectBackup(backupList[0]);
      }
    });

    // Update editor when content changes
    effect(() => {
      const editor = this.editor();
      const content = this.selectedBackupContent();
      if (editor && editor.getValue() !== content) {
        editor.setValue(content);
      }
    });
  }

  private initializeCodeMirror(host: ElementRef<HTMLDivElement>): void {
    try {
      const editorInstance = CodeMirror(host.nativeElement, {
        lineNumbers: true,
        theme: 'dracula',
        mode: { name: 'javascript', json: true },
        lineWrapping: true,
        readOnly: true, // It's a viewer
      });
      editorInstance.setValue(this.selectedBackupContent());
      this.editor.set(editorInstance);
    } catch (e) {
      console.error("Failed to initialize CodeMirror:", e);
    }
  }

  selectBackup(backup: Backup): void {
    this.selectedBackup.set(backup);
  }

  createBackup(): void {
    this.backupService.createBackup();
  }

  downloadBackup(): void {
    const backup = this.selectedBackup();
    if (!backup) {
      return;
    }
    const content = this.backupService.getBackupContent(backup.key);
    if (!content) {
      console.error('Could not get content for backup', backup.key);
      return;
    }

    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `firecnc.conf.v${backup.version}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}