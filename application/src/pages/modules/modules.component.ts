import { ChangeDetectionStrategy, Component, WritableSignal, afterNextRender, effect, inject, viewChild, ElementRef, OnInit, signal } from '@angular/core';
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

  editorHost = viewChild.required<ElementRef<HTMLDivElement>>('editorHost');
  private editor: any; // CodeMirror instance

  constructor() {
    // Reactively display any save errors from the service
    effect(() => {
      this.errorMessage.set(this.moduleService.lastSaveError());
    });
    
    afterNextRender(() => this.initializeCodeMirror());
  }

  ngOnInit(): void {
    const files = this.moduleService.getModuleFileNames();
    this.fileList.set(files);
    if (files.length > 0) {
      this.selectFile(files[0]);
    }
  }

  private initializeCodeMirror(): void {
    try {
      this.editor = CodeMirror(this.editorHost().nativeElement, {
        lineNumbers: true,
        theme: 'dracula',
        mode: { name: 'javascript', json: true },
        lineWrapping: true,
      });

      this.editor.on('change', () => {
        this.isDirty.set(true);
      });
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
    
    const contentSignal = this.moduleService.getModuleFileContent(fileName);
    const content = contentSignal ? contentSignal() : '';
    
    if (this.editor) {
      this.editor.setValue(content);
      // Use a timeout to ensure the refresh happens after the DOM is fully settled.
      setTimeout(() => this.editor.refresh(), 10);
    }
    
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