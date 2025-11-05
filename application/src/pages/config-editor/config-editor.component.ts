/**
 * @file src/pages/config-editor/config-editor.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for the configuration file editor page. Allows direct editing
 * of the `config.json` content.
 */
import { ChangeDetectionStrategy, Component, signal, WritableSignal, ElementRef, viewChild, afterNextRender, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ConfigFileService } from '../../services/config-file.service';

declare var CodeMirror: any;

@Component({
  selector: 'app-config-editor',
  imports: [CommonModule],
  templateUrl: './config-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigEditorComponent {
  private configFileService = inject(ConfigFileService);
  private router = inject(Router);
  
  errorMessage: WritableSignal<string | null> = signal(null);
  isDirty = signal(false);

  editorHost = viewChild.required<ElementRef<HTMLDivElement>>('editorHost');
  private editor: any;

  constructor() {
    afterNextRender(() => this.initializeCodeMirror());
    
    effect(() => {
        this.errorMessage.set(this.configFileService.parseError());
    });
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

      this.resetFile(); // Load initial content
    } catch (e) {
      console.error("Failed to initialize CodeMirror:", e);
    }
  }

  onSave(): void {
    const content = this.editor.getValue();
    const success = this.configFileService.saveConfig(content);
    if (success) {
      this.isDirty.set(false);
      this.router.navigate(['/advanced']);
    }
  }

  onBack(): void {
    if (this.isDirty() && !confirm('You have unsaved changes that will be lost. Are you sure you want to go back?')) {
      return;
    }
    this.router.navigate(['/advanced']);
  }

  resetFile(): void {
    const content = this.configFileService.configFileContent();
    if (this.editor) {
      this.editor.setValue(content);
      // Use a timeout to ensure the refresh happens after the DOM is fully settled.
      setTimeout(() => this.editor.refresh(), 10);
    }
    this.isDirty.set(false);
    this.errorMessage.set(null);
  }
}