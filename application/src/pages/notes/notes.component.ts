import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, viewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NotesService } from '../../services/notes.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-notes-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './notes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotesComponent {
  private notesService = inject(NotesService);
  private destroy$ = new Subject<void>();

  notesContent = new FormControl(this.notesService.notesContent(), { nonNullable: true });
  textarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('notesTextarea');

  constructor() {
    this.notesContent.valueChanges.pipe(
      debounceTime(500), // Wait for 500ms of inactivity before saving
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(content => {
      this.notesService.saveNotes(content);
    });

    afterNextRender(() => {
      this.adjustTextareaHeight();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  adjustTextareaHeight(): void {
    try {
      const textareaEl = this.textarea().nativeElement;
      textareaEl.style.height = 'auto';
      textareaEl.style.height = `${textareaEl.scrollHeight}px`;
    } catch (err) {
      console.error('Could not adjust textarea height:', err);
    }
  }
}
