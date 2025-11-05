/**
 * @file src/pages/snmp-traps/snmp-traps.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for the SNMP Traps page, which displays a live stream of
 * sent SNMP traps from the simulated log file.
 */
import { ChangeDetectionStrategy, Component, Signal, ElementRef, viewChild, effect, inject, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { SnmpTrapLogService, SnmpTrapEntry } from '../../services/snmp-trap-log.service';

@Component({
  selector: 'app-snmp-traps-page',
  imports: [CommonModule, DatePipe],
  templateUrl: './snmp-traps.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SnmpTrapsComponent {
  private snmpTrapLogService = inject(SnmpTrapLogService);
  traps: Signal<SnmpTrapEntry[]> = this.snmpTrapLogService.trapLogEntries;
  reversedTraps = computed(() => this.traps().slice().reverse());
  logContainer = viewChild.required<ElementRef<HTMLDivElement>>('logContainer');

  constructor() {
    // Auto-scroll to the top when new traps arrive
    effect(() => {
      this.reversedTraps(); // Depend on the reversed signal
      // Use a microtask to scroll after the DOM has been updated
      Promise.resolve().then(() => this.scrollToTop());
    });
  }

  clearLogs(): void {
    this.snmpTrapLogService.clearLogs();
  }

  private scrollToTop(): void {
    try {
      const container = this.logContainer().nativeElement;
      container.scrollTop = 0;
    } catch (err) {
      console.error('Error scrolling to top:', err);
    }
  }
}