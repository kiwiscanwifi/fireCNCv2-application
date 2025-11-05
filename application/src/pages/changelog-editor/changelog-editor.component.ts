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
import { ChangeDetectionStrategy, Component, OnInit, ElementRef, viewChild, afterNextRender, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { ChangelogService } from '../../services/changelog.service';

@Component({
  selector: 'app-changelog-editor',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './changelog-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangelogEditorComponent implements OnInit {
  private changelogService = inject(ChangelogService);
  private router = inject(Router);
  
  changelogContent = new FormControl('', { nonNullable: true });

  textarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('changelogTextarea');

  ngOnInit(): void {
    this.changelogContent.setValue(this.changelogService.changelogEntries());
    this.changelogContent.markAsPristine();
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
    const success = this.changelogService.saveChangelog(this.changelogContent.value);
    if (success) {
      this.router.navigate(['/advanced']);
    }
  }

  onBack(): void {
    if (this.changelogContent.dirty && !confirm('You have unsaved changes that will be lost. Are you sure you want to go back?')) {
      return;
    }
    this.router.navigate(['/advanced']);
  }
}