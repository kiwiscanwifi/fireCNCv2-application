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
import { ChangeDetectionStrategy, Component, signal, WritableSignal, ElementRef, viewChild, afterNextRender, inject, effect, computed } from '@angular/core';
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
  protected configFileService = inject(ConfigFileService);
  private router: Router = inject(Router);
  
  errorMessage: WritableSignal<string | null> = signal(null);
  isDirty = signal(false);

  editorHost = viewChild.required<ElementRef<HTMLDivElement>>('editorHost');
  private editor: WritableSignal<any | null> = signal(null);

  constructor() {
    afterNextRender(() => this.initializeCodeMirror());
    
    effect(() => {
        this.errorMessage.set(this.configFileService.parseError());
    });

    // Effect to reactively update the editor content if it changes elsewhere.
    effect(() => {
      const editor = this.editor();
      if (!editor) return; // Guard clause if editor not yet initialized

      const content = this.configFileService.configFileContent();

      if (editor.getValue() !== content) {
        editor.setValue(content);
        // Also ensure dirty state is reset, similar to other editors
        editor.markClean();
        this.isDirty.set(false);
      }
    });
  }

  private initializeCodeMirror(): void {
    try {
      const editorInstance = CodeMirror(this.editorHost().nativeElement, {
        lineNumbers: true,
        theme: 'dracula',
        mode: { name: 'javascript', json: true },
        lineWrapping: true,
        readOnly: false,
      });

      editorInstance.on('change', (_instance: any, changeObj: any) => {
        // Only mark as dirty on user input, not on programmatic changes.
        if (changeObj.origin !== 'setValue') {
          this.isDirty.set(true);
        }
      });
      
      this.editor.set(editorInstance);
    } catch (e) {
      console.error("Failed to initialize CodeMirror:", e);
    }
  }

  onSave(): void {
    const editor = this.editor();
    if (!editor) return;

    const content = editor.getValue();
    this.configFileService.saveConfig(content).then(success => {
      if (success) {
        this.isDirty.set(false);
        this.router.navigate(['/system/advanced']);
      }
    });
  }

  onBack(): void {
    if (this.isDirty() && !confirm('You have unsaved changes that will be lost. Are you sure you want to go back?')) {
      return;
    }
    this.router.navigate(['/system/advanced']);
  }

  resetFile(): void {
    const editor = this.editor();
    if (!editor) return;

    const content = this.configFileService.configFileContent();
      
    editor.setValue(content);
    // Use a timeout to ensure the refresh happens after the DOM is fully settled.
    setTimeout(() => editor.refresh(), 10);
    this.isDirty.set(false);
    this.errorMessage.set(null);
  }
}
