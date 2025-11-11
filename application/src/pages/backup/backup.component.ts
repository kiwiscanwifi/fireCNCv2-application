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

    // Auto-select the first backup if available
    effect(() => {
      const backupList = this.backups();
      if (backupList.length > 0 && !this.selectedBackup()) {
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
}
