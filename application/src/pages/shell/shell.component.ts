/**
 * @file src/pages/shell/shell.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for the interactive shell page. Provides a terminal-like interface
 * for executing commands on a simulated device filesystem.
 */
import { ChangeDetectionStrategy, Component, ElementRef, WritableSignal, afterNextRender, computed, effect, signal, viewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ShellService } from '../../services/shell.service';

interface HistoryEntry {
  command: string;
  output: string;
  prompt: string;
}

@Component({
  selector: 'app-shell',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  private shellService = inject(ShellService);
  history: WritableSignal<HistoryEntry[]> = signal([]);
  commandControl = new FormControl('', { nonNullable: true });
  
  terminalContainer = viewChild.required<ElementRef<HTMLDivElement>>('terminalContainer');
  commandInput = viewChild.required<ElementRef<HTMLInputElement>>('commandInput');

  prompt = computed(() => `fireCNC:${this.shellService.cwd()}$ `);

  constructor() {
    // Add a welcome message to the history on initialization
    this.history.set([{
      command: '',
      prompt: '',
      output: "fireCNC Shell v1.0.0\nType 'help' for a list of available commands."
    }]);

    // Effect to automatically scroll to the bottom when history changes
    effect(() => {
      this.history(); // Depend on the signal
      // Defer scroll to after the view has been updated
      Promise.resolve().then(() => this.scrollToBottom());
    });
    
    // Focus the input on component load
    afterNextRender(() => {
      this.focusInput();
    });
  }

  onCommandSubmit(): void {
    const command = this.commandControl.value.trim();
    this.commandControl.setValue('');
    
    if (command.toLowerCase() === 'clear') {
      this.history.set([]);
      return;
    }
    
    const output = this.shellService.executeCommand(command);
    
    this.history.update(current => [
      ...current,
      { command, output, prompt: this.prompt() }
    ]);
  }

  focusInput(): void {
    try {
      this.commandInput().nativeElement.focus();
    } catch (e) {
      console.error("Could not focus command input.", e);
    }
  }

  private scrollToBottom(): void {
    try {
      const container = this.terminalContainer().nativeElement;
      container.scrollTop = container.scrollHeight;
    } catch (err) {
      console.error('Error scrolling terminal to bottom:', err);
    }
  }
}