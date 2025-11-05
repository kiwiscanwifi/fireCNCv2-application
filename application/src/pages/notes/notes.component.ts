/**
 * @file src/pages/notes/notes.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for the Notes page. Provides a textarea for users to take and save notes.
 */
import { ChangeDetectionStrategy, Component, OnInit, ElementRef, viewChild, afterNextRender, signal, WritableSignal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { NotesService } from '../../services/notes.service';

@Component({
  selector: 'app-notes-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './notes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotesPageComponent implements OnInit {
  private notesService = inject(NotesService);
  notesControl = new FormControl('', { nonNullable: true });
  lastSaved: WritableSignal<string | null> = signal(null);

  textarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('notesTextarea');

  ngOnInit(): void {
    this.notesControl.setValue(this.notesService.notesContent());
    this.notesControl.markAsPristine();
    afterNextRender(() => {
      this.adjustTextareaHeight();
    });
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

  onSave(): void {
    if (this.notesControl.dirty) {
      this.notesService.saveNotes(this.notesControl.value);
      this.notesControl.markAsPristine();
      this.lastSaved.set(new Date().toLocaleTimeString());
    }
  }
}