// FIX: Import 'signal' from '@angular/core' to resolve 'Cannot find name' error.
import { ChangeDetectionStrategy, Component, Signal, ElementRef, viewChild, effect, inject, computed, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { SystemLogService, LogEntry, LogLevel } from '../../services/system-log.service';

@Component({
  selector: 'app-system-log',
  imports: [CommonModule, DatePipe],
  templateUrl: './system-log.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemLogComponent {
  private systemLogService = inject(SystemLogService);
  logs: Signal<LogEntry[]> = this.systemLogService.logEntries;
  logContainer = viewChild.required<ElementRef>('logContainer');

  logLevels: LogLevel[] = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
  
  filters = signal<Record<LogLevel, boolean>>({
    ERROR: true,
    WARN: true,
    INFO: true,
    DEBUG: true,
  });

  filteredLogs = computed(() => {
    const currentLogs = this.logs();
    const currentFilters = this.filters();
    return currentLogs.filter(log => currentFilters[log.level]).slice().reverse();
  });

  constructor() {
    // Auto-scroll to the top when new logs arrive
    effect(() => {
      this.filteredLogs(); // Depend on the filtered signal
      // Use a microtask to scroll after the DOM has been updated
      Promise.resolve().then(() => this.scrollToTop());
    });
  }

  updateFilter(level: LogLevel, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.filters.update(currentFilters => {
      return { ...currentFilters, [level]: isChecked };
    });
  }

  clearLogs(): void {
    const currentFilters = this.filters();
    const levelsToRemove = this.logLevels.filter(level => currentFilters[level]);
    this.systemLogService.clearFilteredLogs(levelsToRemove);

    // Check all filter checkboxes after clearing the logs
    this.filters.set({
      ERROR: true,
      WARN: true,
      INFO: true,
      DEBUG: true,
    });
  }

  private scrollToTop(): void {
    try {
      const container = this.logContainer().nativeElement;
      container.scrollTop = 0;
    } catch (err) {
      console.error('Error scrolling to top:', err);
    }
  }

  getLogLevelClass(level: string): string {
    switch (level) {
      case 'ERROR':
        return 'text-red-400';
      case 'WARN':
        return 'text-yellow-400';
      case 'DEBUG':
        return 'text-purple-400';
      case 'INFO':
      default:
        return 'text-blue-400';
    }
  }
}
