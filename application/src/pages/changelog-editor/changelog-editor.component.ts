/**
 * @file src/pages/changelog-editor/changelog-editor.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for the changelog file editor page. Allows direct editing
 * of the changelog content.
 */
import { ChangeDetectionStrategy, Component, WritableSignal, ElementRef, viewChild, afterNextRender, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ChangelogService } from '../../services/changelog.service';

declare var CodeMirror: any;

@Component({
  selector: 'app-changelog-editor',
  imports: [CommonModule],
  templateUrl: './changelog-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'flex flex-col flex-grow'
  }
})
export class ChangelogEditorComponent {
  private changelogService = inject(ChangelogService);
  private router: Router = inject(Router);
  
  errorMessage = this.changelogService.parseError;
  isDirty = signal(false);

  editorHost = viewChild.required<ElementRef<HTMLDivElement>>('editorHost');
  private editor: WritableSignal<any | null> = signal(null);

  constructor() {
    afterNextRender(() => this.initializeCodeMirror());
    
    // Effect to reactively update the editor content when the file content or the editor itself changes.
    effect(() => {
      const editor = this.editor();
      if (!editor) return; // Guard clause if editor not yet initialized

      const content = this.changelogService.changelogEntries();

      if (editor.getValue() !== content) {
        editor.setValue(content);
        editor.markClean();
        this.isDirty.set(false);
        // Refresh the editor to ensure it resizes correctly.
        setTimeout(() => editor.refresh(), 10);
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
          this.errorMessage.set(null); // Clear previous errors on new input
        }
      });
      
      this.editor.set(editorInstance);
      // Refresh the editor after a short delay to ensure it sizes correctly.
      setTimeout(() => editorInstance.refresh(), 10);
    } catch (e) {
      console.error("Failed to initialize CodeMirror:", e);
    }
  }

  onSave(): void {
    const editor = this.editor();
    if (!editor) return;

    const content = editor.getValue();
    const success = this.changelogService.saveChangelog(content);
    if (success) {
      this.isDirty.set(false);
      this.router.navigate(['/system/advanced']);
    }
    // If not successful, the service will set the parseError, which is displayed.
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

    const content = this.changelogService.changelogEntries();
      
    editor.setValue(content);
    // Use a timeout to ensure the refresh happens after the DOM is fully settled.
    window.setTimeout(() => editor.refresh(), 10);
    this.isDirty.set(false);
    this.errorMessage.set(null);
  }
}