import { Injectable, WritableSignal, inject } from '@angular/core';
import { LogLevel } from './system-log.service';
import { SnmpTrapLogService } from './snmp-trap-log.service';
import { NotificationService } from './notification.service';
import { ConfigManagementService } from './config-management.service';
import { StateService } from './state.service';

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
  DISPLAY_OID_ON_STATUS_PAGE: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SnmpConfigService {
  private snmpTrapLogService = inject(SnmpTrapLogService);
  private notificationService = inject(NotificationService);
  private configManagementService = inject(ConfigManagementService);
  private stateService = inject(StateService);
  
  // The config signal is now sourced from the central StateService.
  config: WritableSignal<SnmpConfig> = this.stateService.snmpConfig;

  /**
   * Stages an update to the SNMP configuration via the ConfigManagementService.
   * @param newConfig The partial configuration object with new values.
   * @param showNotification Whether to display a global success notification.
   */
  updateConfig(newConfig: Partial<SnmpConfig>, showNotification = true): void {
    const fullConfig = { ...this.config(), ...newConfig };
    this.configManagementService.updateSnmpConfig(fullConfig);
    // This action is on a view-only page, so we commit immediately.
    this.configManagementService.commitChanges(showNotification);
  }

  /**
   * Simulates sending an SNMP trap.
   * @param message The message to include in the trap.
   */
  sendTrap(message: string): void {
    const config = this.config();
    if (!config.TRAPS_ENABLED) {
      console.log('[SNMP TRAP IGNORED] Traps are disabled in configuration.');
      this.notificationService.showError('SNMP Traps are disabled in configuration.');
      return;
    }
    // In a real application, this would use a library to send a real SNMP trap.
    // For this simulation, we log to the console.
    const logMessage = `[SNMP TRAP SENT] To: ${config.TRAP_TARGET}:${config.TRAP_PORT} | Community: ${config.TRAP_COMMUNITY} | Message: ${message}`;
    console.log(logMessage);

    // Always log the trap to our simulated log file service
    this.snmpTrapLogService.logTrap(message);
  }
}