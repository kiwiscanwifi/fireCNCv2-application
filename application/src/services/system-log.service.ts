/**
 * @file src/services/system-log.service.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * A service that simulates fetching and parsing a `system.log` file from the device.
 * It provides a signal with the latest log entries and sends SNMP traps for errors.
 */
import { Injectable, signal, WritableSignal, OnDestroy, inject } from '@angular/core';
import { SnmpConfigService } from './snmp-config.service';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class SystemLogService implements OnDestroy {
  private snmpConfigService = inject(SnmpConfigService);
  
  private readonly MAX_LOG_ENTRIES = 200;
  private logFetchInterval: any;
  private readonly levelSeverity: Record<LogLevel, number> = {
    'DEBUG': 0,
    'INFO': 1,
    'WARN': 2,
    'ERROR': 3,
  };

  logEntries: WritableSignal<LogEntry[]> = signal([]);

  constructor() {
    this.startLogSimulation();
  }

  ngOnDestroy() {
    clearInterval(this.logFetchInterval);
  }

  private startLogSimulation() {
    // Immediately populate with some initial data
    this.generateLogEntry();
    this.generateLogEntry();
    this.generateLogEntry();

    // Then, add new entries periodically
    this.logFetchInterval = setInterval(() => {
      this.generateLogEntry();
    }, 3000); // Fetch/simulate new log data every 3 seconds
  }

  /**
   * Public method to clear all log entries.
   */
  public clearLogs(): void {
    this.logEntries.set([]);
  }

  /**
   * Clears log entries of the specified levels.
   * @param levelsToRemove An array of log levels to remove from the log.
   */
  public clearFilteredLogs(levelsToRemove: LogLevel[]): void {
    this.logEntries.update(entries =>
      entries.filter(entry => !levelsToRemove.includes(entry.level))
    );
  }

  /**
   * Public method to allow other services to add entries to the system log.
   * @param level The log level (e.g., 'INFO', 'ERROR').
   * @param message The log message.
   */
  public addSystemLog(level: LogLevel, message: string): void {
    const newEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: level,
      message: message,
    };
    this.processNewLogEntry(newEntry);
  }

  private processNewLogEntry(entry: LogEntry): void {
    // Check if the log level meets the configured threshold for sending a trap
    const config = this.snmpConfigService.config();
    const configuredSeverity = this.levelSeverity[config.TRAP_LEVEL];
    const entrySeverity = this.levelSeverity[entry.level];

    if (entrySeverity >= configuredSeverity) {
      this.snmpConfigService.sendTrap(`${entry.level} Detected: ${entry.message}`);
    }

    this.logEntries.update(entries => {
      const newLogs = [...entries, entry];
      return newLogs.slice(Math.max(newLogs.length - this.MAX_LOG_ENTRIES, 0));
    });
  }

  private generateLogEntry() {
    const levels: LogLevel[] = ['INFO', 'INFO', 'INFO', 'WARN', 'ERROR', 'DEBUG'];
    const messages = [
      'System initialized successfully.',
      'User authentication successful for user: admin',
      'Network interface eth0 configured with IP 192.168.4.1.',
      'SD card check: OK. Found 14.8GB/15.9GB used.',
      'High temperature warning: CPU at 75°C.',
      'Failed to connect to NTP server time.google.com.',
      'CAN bus initialization failed. Retrying...',
      'SSH connection opened from 192.168.4.100.',
      'Digital output DO_3 toggled to ON.',
      'Configuration file loaded from /etc/firecnc.conf.',
      'Debugging SPI communication with W5500.',
    ];

    const randomLevel = levels[Math.floor(Math.random() * levels.length)];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    const timestamp = new Date().toISOString();

    const newEntry: LogEntry = {
      timestamp,
      level: randomLevel,
      message: randomMessage,
    };
    
    this.processNewLogEntry(newEntry);
  }
}