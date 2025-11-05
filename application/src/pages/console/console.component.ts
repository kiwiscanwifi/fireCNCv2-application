/**
 * @file src/pages/console/console.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for the Console page, which displays a live stream of logs
 * from the WebSocket connection and auto-scrolls to the latest message.
 */
import { ChangeDetectionStrategy, Component, Signal, ElementRef, viewChild, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebSocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-console-page',
  imports: [CommonModule],
  templateUrl: './console.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsoleComponent {
  webSocketService = inject(WebSocketService);
  logs: Signal<string[]> = this.webSocketService.logMessages;
  logContainer = viewChild.required<ElementRef<HTMLDivElement>>('logContainer');

  constructor() {
    // Auto-scroll to the bottom when new logs arrive
    effect(() => {
      // Access the signal to create a dependency
      this.logs();
      // Use a microtask to scroll after the DOM has been updated
      Promise.resolve().then(() => this.scrollToBottom());
    });
  }

  clearLogs(): void {
    this.webSocketService.clearLogs();
  }

  private scrollToBottom(): void {
    try {
      const container = this.logContainer().nativeElement;
      container.scrollTop = container.scrollHeight;
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }
}