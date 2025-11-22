import { ChangeDetectionStrategy, Component, WritableSignal, effect, inject, viewChild, ElementRef, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageFileService } from '../../services/language-file.service';

declare var CodeMirror: any;

@Component({
  selector: 'app-language-editor',
  imports: [CommonModule],
  templateUrl: './language-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'flex flex-col flex-grow'
  }
})
export class LanguageEditorComponent implements OnInit {
  private languageFileService = inject(LanguageFileService);

  fileList = this.languageFileService.availableLangs;
  selectedFile: WritableSignal<string | null> = signal(null);
  errorMessage = this.languageFileService.lastSaveError;
  isDirty = signal(false);

  editorHost = viewChild<ElementRef<HTMLDivElement>>('editorHost');
  private editor: WritableSignal<any | null> = signal(null);

  constructor() {
    effect(() => {
      const host = this.editorHost();
      if (host && !this.editor()) {
        this.initializeCodeMirror(host);
      }
    });

    effect(() => {
      const fileName = this.selectedFile();
      const editor = this.editor();
      if (fileName && editor) {
        const content = this.languageFileService.getLanguageFileContent(fileName);
        if (editor.getValue() !== content) {
          editor.setValue(content);
          editor.markClean();
          this.isDirty.set(false);
          // Refresh the editor to ensure it resizes correctly.
          setTimeout(() => editor.refresh(), 10);
        }
      }
    });
  }

  ngOnInit(): void {
    const files = this.fileList();
    if (files.length > 0) {
      this.selectFile(files[0]);
    }
  }

  private initializeCodeMirror(host: ElementRef<HTMLDivElement>): void {
    try {
      const editorInstance = CodeMirror(host.nativeElement, {
        lineNumbers: true,
        theme: 'dracula',
        mode: { name: 'javascript', json: true },
        lineWrapping: true,
      });
      this.editor.set(editorInstance);
      editorInstance.on('change', () => {
        this.isDirty.set(true);
      });
      // Refresh the editor after a short delay to ensure it sizes correctly.
      setTimeout(() => editorInstance.refresh(), 10);
    } catch (e) {
      console.error("Failed to initialize CodeMirror:", e);
    }
  }
  
  selectFile(lang: string): void {
    if (this.isDirty() && !confirm('You have unsaved changes. Are you sure you want to switch files?')) {
      return;
    }
    this.selectedFile.set(lang);
  }

  saveFile(): void {
    const lang = this.selectedFile();
    const editor = this.editor();
    if (lang && editor && this.isDirty()) {
      const success = this.languageFileService.updateLanguageFileContent(lang, editor.getValue());
      if (success) {
        editor.markClean();
        this.isDirty.set(false);
      }
    }
  }

  resetFile(): void {
    const lang = this.selectedFile();
    const editor = this.editor();
    if (lang && editor) {
      const content = this.languageFileService.getLanguageFileContent(lang);
      editor.setValue(content);
      editor.markClean();
      this.isDirty.set(false);
    }
  }

  createNewLanguage(): void {
    const langCode = prompt('Enter the 2-letter language code (e.g., de, es, fr):');
    if (langCode && /^[a-z]{2}$/.test(langCode)) {
      this.languageFileService.createLanguageFile(langCode);
      this.selectFile(langCode);
    } else if (langCode) {
      alert('Invalid language code. Please enter a 2-letter lowercase code.');
    }
  }
}