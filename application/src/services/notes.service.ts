/**
 * @file src/services/notes.service.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * A service that manages user notes, persisting them to local storage.
 */
import { Injectable, signal, WritableSignal, inject } from '@angular/core';
import { PersistenceService } from './persistence.service';

@Injectable({
  providedIn: 'root',
})
export class NotesService {
  private persistenceService = inject(PersistenceService);
  private readonly NOTES_CONTENT_KEY = 'fireCNC_notesContent';
  notesContent: WritableSignal<string> = signal('');

  constructor() {
    this.initializeNotes();
  }
  
  private initializeNotes(): void {
    const storedContent = this.persistenceService.getItem<string>(this.NOTES_CONTENT_KEY);
    if (storedContent !== null) {
      this.notesContent.set(storedContent);
    } else {
      const initialContent = '# My Notes\n\n- This is a scratchpad for your notes.\n- Content is saved automatically in your browser\'s local storage.';
      this.notesContent.set(initialContent);
      this.persistenceService.setItem(this.NOTES_CONTENT_KEY, initialContent);
    }
  }

  saveNotes(content: string): boolean {
    this.notesContent.set(content);
    this.persistenceService.setItem(this.NOTES_CONTENT_KEY, content);
    console.log(`[Notes Service] Notes saved to local storage.`);
    return true;
  }
}