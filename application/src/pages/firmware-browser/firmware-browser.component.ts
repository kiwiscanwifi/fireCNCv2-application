import { ChangeDetectionStrategy, Component, WritableSignal, computed, effect, inject, viewChild, ElementRef, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FirmwareFilesService } from '../../services/firmware-files.service';

declare var CodeMirror: any; // Let TypeScript know about the global CodeMirror object

@Component({
  selector: 'app-firmware-browser',
  imports: [CommonModule, RouterLink],
  templateUrl: './firmware-browser.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FirmwareBrowserComponent implements OnInit {
  private firmwareFilesService = inject(FirmwareFilesService);
  
  fileList = this.firmwareFilesService.files;
  selectedFile: WritableSignal<string | null> = signal(null);
  
  fileContent = computed(() => {
    const path = this.selectedFile();
    if (!path) return '';
    return this.firmwareFilesService.getFileContent(path)?.() ?? '';
  });

  editorHost = viewChild<ElementRef<HTMLDivElement>>('editorHost');
  private editor: any; // CodeMirror instance
  isDirty = signal(false); // Track changes in CodeMirror
  errorMessage: WritableSignal<string | null> = signal(null); // NEW: Signal for error messages

  constructor() {
    effect(() => {
      const host = this.editorHost();
      if (host && !this.editor) {
        this.initializeCodeMirror(host);
      }
    });

    effect(() => {
      const content = this.fileContent();
      if (this.editor && this.editor.getValue() !== content) {
        this.editor.setValue(content);
        this.editor.markClean(); 
        this.isDirty.set(false);
      }
    });
    
    effect(() => {
      this.errorMessage.set(this.firmwareFilesService.lastSaveError());
    });
  }
  
  ngOnInit() {
      const files = this.fileList();
      const defaultFile = files.find(f => f.endsWith('.ino')) || files[0];
      if(defaultFile) {
          this.selectFile(defaultFile);
      }
  }

  private initializeCodeMirror(host: ElementRef<HTMLDivElement>): void {
    try {
      this.editor = CodeMirror(host.nativeElement, {
        lineNumbers: true,
        theme: 'dracula',
        mode: { name: 'clike', json: false }, // Use 'clike' for C++/Arduino syntax highlighting
        lineWrapping: true, // Keep line wrapping to avoid horizontal scrollbar in editor
        readOnly: false, // Allow editing
        height: 'auto', // Auto-adjust height to fit content
        viewportMargin: Infinity, // Render all lines
      });

      this.editor.on('change', () => {
        this.isDirty.set(true);
      });

      // Set initial content if available
      const content = this.fileContent();
      if (content) {
        this.editor.setValue(content);
        this.editor.markClean();
        this.isDirty.set(false);
      }
    } catch (e) {
      console.error("Failed to initialize CodeMirror:", e);
    }
  }

  selectFile(path: string): void {
    if (this.isDirty() && !confirm('You have unsaved changes. Are you sure you want to switch files?')) {
      return;
    }
    this.selectedFile.set(path);
    this.isDirty.set(false); // Reset dirty state when selecting a new file
  }

  saveFile(): void {
    const path = this.selectedFile();
    if (path && this.isDirty()) {
      const success = this.firmwareFilesService.updateFileContent(path, this.editor.getValue());
      if (success) {
        this.editor.markClean(); // Mark CodeMirror as clean after saving
        this.isDirty.set(false);
        this.errorMessage.set(null); // Clear error on successful save
      }
    }
  }
}
