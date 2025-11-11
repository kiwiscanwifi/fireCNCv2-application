import { ChangeDetectionStrategy, Component, WritableSignal, effect, inject, viewChild, ElementRef, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModuleService } from '../../services/module.service';

declare var CodeMirror: any; // Let TypeScript know about the global CodeMirror object

@Component({
  selector: 'app-modules-page',
  imports: [CommonModule],
  templateUrl: './modules.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModulesPageComponent implements OnInit {
  private moduleService = inject(ModuleService);

  fileList: WritableSignal<string[]> = signal([]);
  selectedFile: WritableSignal<string | null> = signal(null);
  errorMessage: WritableSignal<string | null> = signal(null);
  isDirty = signal(false);

  editorHost = viewChild<ElementRef<HTMLDivElement>>('editorHost');
  private editor: any; // CodeMirror instance

  constructor() {
    // Reactively display any save errors from the service
    effect(() => {
      this.errorMessage.set(this.moduleService.lastSaveError());
    });
    
    // Initialize CodeMirror once the host element is available
    effect(() => {
      const host = this.editorHost();
      if (host && !this.editor) {
        this.initializeCodeMirror(host);
      }
    });

    // Update editor content when a different file is selected
    effect(() => {
      const fileName = this.selectedFile();
      if (fileName && this.editor) {
        const contentSignal = this.moduleService.getModuleFileContent(fileName);
        const content = contentSignal ? contentSignal() : '';
        if (this.editor.getValue() !== content) {
          this.editor.setValue(content);
          this.editor.markClean();
          this.isDirty.set(false);
        }
      }
    });
  }

  ngOnInit(): void {
    const files = this.moduleService.getModuleFileNames();
    this.fileList.set(files);
    if (files.length > 0) {
      this.selectFile(files[0]);
    }
  }

  private initializeCodeMirror(host: ElementRef<HTMLDivElement>): void {
    try {
      this.editor = CodeMirror(host.nativeElement, {
        lineNumbers: true,
        theme: 'dracula',
        mode: { name: 'javascript', json: true },
        lineWrapping: true,
      });

      this.editor.on('change', () => {
        this.isDirty.set(true);
      });

      // Set initial content if a file is already selected
      const initialFile = this.selectedFile();
      if (initialFile) {
        const contentSignal = this.moduleService.getModuleFileContent(initialFile);
        const content = contentSignal ? contentSignal() : '';
        this.editor.setValue(content);
        this.editor.markClean();
        this.isDirty.set(false);
      }
    } catch (e) {
      console.error("Failed to initialize CodeMirror:", e);
    }
  }
  
  selectFile(fileName: string): void {
    if (this.isDirty() && !confirm('You have unsaved changes. Are you sure you want to switch files?')) {
      return;
    }
    this.selectedFile.set(fileName);
    this.errorMessage.set(null);
    this.isDirty.set(false);
  }

  saveFile(): void {
    const path = this.selectedFile();
    if (path && this.isDirty()) {
      const success = this.moduleService.updateModuleFileContent(path, this.editor.getValue());
      if (success) {
        this.isDirty.set(false);
      }
    }
  }

  resetFile(): void {
    const path = this.selectedFile();
    if (path) {
      const contentSignal = this.moduleService.getModuleFileContent(path);
      const content = contentSignal ? contentSignal() : '';
      this.editor.setValue(content);
      this.isDirty.set(false);
      this.errorMessage.set(null);
    }
  }
}
