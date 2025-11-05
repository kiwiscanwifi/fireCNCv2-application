import { Injectable, signal, WritableSignal, inject } from '@angular/core';
import { LogLevel } from './system-log.service';
import { SnmpTrapLogService } from './snmp-trap-log.service';

export type SnmpProtocol = 'UDP' | 'TCP';

export interface SnmpConfig {
  TRAP_TARGET: string;
  TRAP_PORT: number;
  TRAP_COMMUNITY: string;
  TRAP_PROTOCOL: SnmpProtocol;
  COMMUNITY: string;
  PORT: number;
  PROTOCOL: SnmpProtocol;
  TRAP_LEVEL: LogLevel;
  TRAPS_ENABLED: boolean;
  TRAP_LOG_PATH: string;
  AGENT_ENABLED: boolean;
  DISPLAY_OID_ON_STATUS_PAGE: boolean; // NEW: Added property
}

export interface ToastNotification {
  title: string;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class SnmpConfigService {
  private snmpTrapLogService = inject(SnmpTrapLogService);
  
  // Default configuration values based on config.json
  config: WritableSignal<SnmpConfig> = signal({
    TRAP_TARGET: '0.0.0.0',
    TRAP_PORT: 162,
    TRAP_COMMUNITY: 'SNMP_trap',
    TRAP_PROTOCOL: 'UDP',
    COMMUNITY: 'public',
    PORT: 161,
    PROTOCOL: 'UDP',
    TRAP_LEVEL: 'ERROR',
    TRAPS_ENABLED: true,
    TRAP_LOG_PATH: '/logs/snmp_trap.log',
    AGENT_ENABLED: true,
    DISPLAY_OID_ON_STATUS_PAGE: true, // NEW: Default to true
  });

  // Keep lastNotification for Alexa service announcements
  lastNotification: WritableSignal<ToastNotification | null> = signal(null);

  /**
   * Updates the SNMP configuration and simulates saving to a file.
   * @param newConfig The partial configuration object with new values.
   */
  updateConfig(newConfig: Partial<SnmpConfig>): void {
    this.config.update(currentConfig => ({ ...currentConfig, ...newConfig }));
    console.log('Simulating save to config.json with new values:', this.config());
    
    // REMOVED: No longer displaying toast for SNMP config saves.
    // this.lastNotification.set({ title: 'Configuration Saved', message: 'SNMP settings updated successfully!' });
    // setTimeout(() => this.lastNotification.set(null), 3000);
  }

  /**
   * Simulates sending an SNMP trap and triggers a UI notification.
   * @param message The message to include in the trap.
   */
  sendTrap(message: string): void {
    const config = this.config();
    if (!config.TRAPS_ENABLED) {
      console.log('[SNMP TRAP IGNORED] Traps are disabled in configuration.');
      return;
    }
    // In a real application, this would use a library to send a real SNMP trap.
    // For this simulation, we log to the console.
    const logMessage = `[SNMP TRAP SENT] To: ${config.TRAP_TARGET}:${config.TRAP_PORT} | Community: ${config.TRAP_COMMUNITY} | Message: ${message}`;
    console.log(logMessage);

    // Always log the trap to our simulated log file service
    this.snmpTrapLogService.logTrap(message);
    
    // REMOVED: No longer setting lastNotification for SNMP traps to avoid pop-ups.
    // The `lastNotification` signal is retained for Alexa notifications.
  }
}