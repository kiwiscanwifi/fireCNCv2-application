/**
 * @file src/pages/firmware-browser/firmware-browser.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for the firmware browser and editor page. Allows viewing and editing
 * of the reverse-engineered firmware source code.
 */
// FIX: Import the `signal` function from '@angular/core' to resolve 'Cannot find name' error.
import { ChangeDetectionStrategy, Component, WritableSignal, afterNextRender, computed, effect, inject, viewChild, ElementRef, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FirmwareFilesService } from '../../services/firmware-files.service';

@Component({
  selector: 'app-firmware-browser',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './firmware-browser.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FirmwareBrowserComponent implements OnInit {
  private firmwareFilesService = inject(FirmwareFilesService);
  
  fileList = this.firmwareFilesService.files;
  selectedFile: WritableSignal<string | null> = signal(null);
  
  editorContent = new FormControl('', { nonNullable: true });
  
  fileContent = computed(() => {
    const path = this.selectedFile();
    if (!path) return '';
    // The getFileContent method returns a signal, so we invoke it to get the content
    return this.firmwareFilesService.getFileContent(path)?.() ?? '';
  });

  textarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('editorTextarea');

  constructor() {
    effect(() => {
      const content = this.fileContent();
      this.editorContent.setValue(content, { emitEvent: false });
      this.editorContent.markAsPristine();
      afterNextRender(() => this.adjustTextareaHeight());
    });
  }
  
  ngOnInit() {
      // Default to showing the main .ino file on load
      const files = this.fileList();
      const defaultFile = files.find(f => f.endsWith('.ino')) || files[0];
      if(defaultFile) {
          this.selectFile(defaultFile);
      }
  }

  selectFile(path: string): void {
    this.selectedFile.set(path);
  }

  saveFile(): void {
    const path = this.selectedFile();
    if (path && this.editorContent.dirty) {
      this.firmwareFilesService.updateFileContent(path, this.editorContent.value);
      this.editorContent.markAsPristine();
    }
  }

  adjustTextareaHeight(): void {
    try {
      const textareaEl = this.textarea().nativeElement;
      textareaEl.style.height = 'auto'; // Reset height to shrink if text is deleted
      textareaEl.style.height = `${textareaEl.scrollHeight}px`;
    } catch (err) {
      console.error('Could not adjust textarea height:', err);
    }
  }
}