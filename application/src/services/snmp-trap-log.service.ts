/**
 * @file src/services/snmp-trap-log.service.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * A service that simulates reading and writing to an `snmp_trap.log` file.
 * It holds the trap log entries in memory for the UI to display.
 */
import { Injectable, signal, WritableSignal } from '@angular/core';

export interface SnmpTrapEntry {
  timestamp: string;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class SnmpTrapLogService {
  private readonly MAX_LOG_ENTRIES = 200;

  trapLogEntries: WritableSignal<SnmpTrapEntry[]> = signal([]);

  /**
   * Adds a new trap message to the log.
   * @param message The trap message content.
   */
  logTrap(message: string): void {
    const newEntry: SnmpTrapEntry = {
      timestamp: new Date().toISOString(),
      message: message,
    };

    this.trapLogEntries.update(entries => {
      const newLogs = [...entries, newEntry];
      // Keep the log from growing indefinitely
      return newLogs.slice(Math.max(newLogs.length - this.MAX_LOG_ENTRIES, 0));
    });
    
    // Simulate writing to a file
    console.log(`[Simulating Log Write] Appending to /logs/snmp_trap.log: ${JSON.stringify(newEntry)}`);
  }

  /**
   * Clears all trap log entries.
   */
  clearLogs(): void {
    this.trapLogEntries.set([]);
  }
}