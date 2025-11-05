/**
 * @file src/pages/reference-editor/reference-editor.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for the reference file editor page. Allows direct editing
 * of the GPIO reference content.
 */
import { ChangeDetectionStrategy, Component, OnInit, ElementRef, viewChild, afterNextRender, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { ReferenceFileService } from '../../services/reference-file.service';

@Component({
  selector: 'app-reference-editor',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reference-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferenceEditorComponent implements OnInit {
  private referenceFileService = inject(ReferenceFileService);
  private router = inject(Router);
  
  referenceContent = new FormControl('', { nonNullable: true });

  textarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('referenceTextarea');

  ngOnInit(): void {
    this.referenceContent.setValue(this.referenceFileService.referenceContent());
    // Adjust height after view is initialized and content is set.
    afterNextRender(() => {
      this.adjustTextareaHeight();
    });
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

  onSave(): void {
    const success = this.referenceFileService.saveReference(this.referenceContent.value);
    if (success) {
      this.router.navigate(['/settings']);
    }
  }

  onBack(): void {
    this.router.navigate(['/settings']);
  }
}