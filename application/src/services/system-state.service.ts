import { Injectable, signal, WritableSignal, OnDestroy, effect, inject } from '@angular/core';
import { WebSocketService, ConnectionStatus } from './websocket.service';
import { PersistenceService } from './persistence.service';
import { SnmpConfigService } from './snmp-config.service';
import { SystemLogService, LogLevel } from './system-log.service';
import { versions } from '../version';
import { StateService, LedState, SystemInfo, SdCardInfo, HealthStats } from './state.service';
import { IoService } from './io.service';
import { Injector } from '@angular/core';

export type RestartReason = 'User Reboot' | 'Watchdog Timeout' | 'SD Card Failure' | 'Shutdown Pin' | 'Normal Power-Up' | 'ICMP Watchdog Timeout';
const RESTART_REASON_KEY = 'fireCNC_restartReason';


@Injectable({
  providedIn: 'root',
})
export class SystemStateService implements OnDestroy {
  private webSocketService = inject(WebSocketService);
  private persistenceService = inject(PersistenceService);
  private snmpConfigService = inject(SnmpConfigService);
  private systemLogService = inject(SystemLogService);
  private stateService = inject(StateService);
  private injector = inject(Injector);

  private _ioService!: IoService;
  private get ioService(): IoService {
    if (!this._ioService) {
      this._ioService = this.injector.get(IoService);
    }
    return this._ioService;
  }
  
  private readonly HEALTH_STATS_KEY = 'fireCNC_healthStats';
  private rebootInProgress = false;
  private watchdogTimer: number | null = null;
  private lastHeartbeat: number = Date.now();
  private icmpWatchdogTimer: number | null = null;
  private icmpFailureCount = 0;
  private icmpWatchdogInitialDelayTimer: number | null = null;
  
  // Signals are now in StateService
  systemInfo = this.stateService.systemInfo;
  sdCardInfo = this.stateService.sdCardInfo;
  sdCardErrorActive = this.stateService.sdCardErrorActive;
  sdCardErrorTimestamp = this.stateService.sdCardErrorTimestamp;
  onboardLed = this.stateService.onboardLed;
  healthStats = this.stateService.healthStats;
  isShuttingDown = this.stateService.isShuttingDown;

  private uptimeInterval: number | null = null;
  private uptimeSeconds = 0;

  constructor() {
    this.systemInfo.set({
      firmwareVersion: `v${versions.FIRMWARE_VERSION}`,
      firmwareDate: versions.APP_RELEASE_DATE,
      uptime: '0h 0m 0s',
      ipAddress: '192.168.1.20',
      sshEnabled: true,
    });
    this.sdCardInfo.set({
      status: 'Uninitialized',
      usedGb: 14.8,
      totalGb: 15.9,
    });


    const restartReason = this.persistenceService.getItem<RestartReason>(RESTART_REASON_KEY) ?? 'Normal Power-Up';
    const logMessage = `System startup detected. Reason: ${restartReason}.`;
    const logLevel: LogLevel = (restartReason === 'Normal Power-Up' || restartReason === 'User Reboot') ? 'INFO' : 'WARN';
    this.systemLogService.addSystemLog(logLevel, logMessage);
    
    if (restartReason !== 'Normal Power-Up') {
      this.persistenceService.setItem(RESTART_REASON_KEY, null);
    }
    
    this.startUptimeSimulation();
    this.ioService.triggerBeep(2); // Beep twice on power up

    const storedStats = this.persistenceService.getItem<HealthStats>(this.HEALTH_STATS_KEY);
    const initialStats: HealthStats = storedStats ?? { startups: 0, watchdogReboots: 0 };
    initialStats.startups++;
    this.persistenceService.setItem(this.HEALTH_STATS_KEY, initialStats);
    this.healthStats.set(initialStats);
    
    effect(() => {
        const sshConf = this.stateService.sshConfig();
        this.systemInfo.update(info => ({...info, sshEnabled: sshConf.ENABLED}));
    });

    effect(() => {
      const status = this.webSocketService.connectionStatus();
      if (status === 'connected') {
        const ip = this.systemInfo().ipAddress;
        const color = ip === this.stateService.networkConfig().STATIC_IP ? '#00FF00' : '#0000FF';
        
        this.onboardLed.set({ color, flashing: true, brightness: 255 });
        
        setTimeout(() => {
          this.onboardLed.update(s => ({ ...s, flashing: false }));
        }, 3000);
      } else if (status === 'disconnected') {
        this.onboardLed.set({ color: 'off', flashing: false, brightness: 255 });
      }
    });

    effect(() => {
      const status = this.webSocketService.connectionStatus();
      if (status === 'restarting') {
        this.rebootInProgress = true;
      }
      
      if (status === 'connected' && this.rebootInProgress) {
        this.rebootInProgress = false;
        this.incrementStartupsOnReboot();
      }
    });

    effect(() => {
      const isEnabled = this.stateService.watchdogConfig().WATCHDOG;
      const status = this.webSocketService.connectionStatus();
      if (isEnabled && status === 'connected') {
        this.startWatchdog();
      } else {
        this.stopWatchdog();
      }
    });
    
    effect(() => {
      const config = this.stateService.watchdogConfig();
      const status = this.webSocketService.connectionStatus();
      if (config.WATCHDOG_IP && status === 'connected') {
        this.startIcmpWatchdog();
      } else {
        this.stopIcmpWatchdog();
      }
    });

    // NEW effect to keep systemInfo.ipAddress in sync with the active network interface.
    effect(() => {
      const ethStatus = this.webSocketService.connectionStatus();
      const netConf = this.stateService.networkConfig();
      const wifiConf = this.stateService.wifiConfig();
      const wifiStatus = this.stateService.wifiStatus();

      let activeIp = '0.0.0.0'; // Default for disconnected state

      // Logic to determine the active IP
      if (ethStatus === 'connected') {
        // network config might not be loaded yet, so check for property existence
        activeIp = netConf?.STATIC_IP || '0.0.0.0';
      } else if (wifiConf?.MODE === 'AP') {
        activeIp = netConf?.AP_IP || '0.0.0.0';
      } else if (wifiConf?.MODE === 'Station' && wifiStatus?.status === 'connected' && wifiStatus.allocatedIp !== '0.0.0.0') {
        activeIp = wifiStatus.allocatedIp;
      }
      
      // Update the single source of truth for the system's IP
      this.systemInfo.update(info => {
        // Only update if the IP has actually changed to avoid unnecessary signal updates.
        if (info.ipAddress !== activeIp) {
          return { ...info, ipAddress: activeIp };
        }
        return info; // Return original object if no change, to prevent signal notification
      });
    });

    effect(() => {
      // FIX: Correct property name from WEBSOCKET_PORT to WEBSOCKET_URL.
      this.stateService.watchdogConfig().WEBSOCKET_URL;
      this.webSocketService.simulateConnect(); 
    });

    setTimeout(() => this.simulateSdInitialization(), 1000);
  }

  ngOnDestroy(): void {
    if (this.uptimeInterval !== null) clearInterval(this.uptimeInterval);
    this.stopWatchdog();
    this.stopIcmpWatchdog();
  }
  
  public triggerSdErrorVisual(reason: string): void {
    if (this.sdCardErrorActive()) return;

    console.error(`SD Card Error Triggered: ${reason}`);
    this.sdCardErrorActive.set(true);
    this.sdCardErrorTimestamp.set(Date.now());
    this.ioService.triggerBeep(3);
    this.snmpConfigService.sendTrap(reason);

    const config = this.stateService.watchdogConfig();
    if (config.FAILURE_SD_REBOOT) {
      console.log(`Scheduling reboot in ${config.FAILURE_SD_REBOOT_TIMEOUT} seconds due to SD card failure.`);
      setTimeout(() => {
        this.rebootDevice('SD Card Failure');
      }, config.FAILURE_SD_REBOOT_TIMEOUT * 1000);
    }
  }

  private simulateSdInitialization(): void {
    this.sdCardInfo.update(s => ({ ...s, status: 'Mounted' }));
    this.snmpConfigService.sendTrap('SD Card initialized and mounted successfully.');
  }

  public rebootDevice(reason: RestartReason = 'User Reboot'): void {
    this.persistenceService.setItem(RESTART_REASON_KEY, reason);
    this.ioService.triggerBeep(3);
    this.webSocketService.setRestarting();
    if (this.uptimeInterval !== null) clearInterval(this.uptimeInterval);

    setTimeout(() => {
        console.log(`Simulating device reboot (Reason: ${reason}): resetting state and reconnecting.`);
        this.isShuttingDown.set(false);
        this.uptimeSeconds = 0;
        this.systemInfo.update(info => ({ ...info, uptime: '0h 0m 0s' }));
        this.startUptimeSimulation();
        this.webSocketService.simulateConnect();
    }, 5000);
  }

  public shutdownDevice(): void {
    if (this.isShuttingDown()) return;

    this.snmpConfigService.sendTrap('Shutdown Initiated via GPIO pin.');
    this.isShuttingDown.set(true);
    
    setTimeout(() => {
        console.log('Simulating device reboot from shutdown pin.');
        this.rebootDevice('Shutdown Pin');
    }, 5500);
  }

  private startUptimeSimulation() {
    this.uptimeInterval = window.setInterval(() => {
      this.uptimeSeconds++;
      this.lastHeartbeat = Date.now();
      const d = Math.floor(this.uptimeSeconds / (3600*24));
      const h = Math.floor(this.uptimeSeconds % (3600*24) / 3600);
      const m = Math.floor(this.uptimeSeconds % 3600 / 60);
      const s = Math.floor(this.uptimeSeconds % 60);
      
      let uptimeString = '';
      if (d > 0) uptimeString += `${d}d `;
      uptimeString += `${h}h ${m}m ${s}s`;

      this.systemInfo.update(info => ({ ...info, uptime: uptimeString }));
    }, 1000);
  }
  
  public updateOnboardLedState(newState: Partial<LedState>): void {
    this.onboardLed.update(current => ({ ...current, ...newState }));
    console.log('Onboard LED state updated:', this.onboardLed());
  }

  private incrementStartupsOnReboot(): void {
    this.healthStats.update(stats => {
      const newStats = { ...stats, startups: stats.startups + 1 };
      this.persistenceService.setItem(this.HEALTH_STATS_KEY, newStats);
      return newStats;
    });
  }

  public incrementWatchdogRebootsAndReboot(): void {
    this.healthStats.update(stats => {
      const newStats = { ...stats, watchdogReboots: stats.watchdogReboots + 1 };
      this.persistenceService.setItem(this.HEALTH_STATS_KEY, newStats);
      console.log('Watchdog reboot triggered! New count:', newStats.watchdogReboots);
      return newStats;
    });
    this.rebootDevice('Watchdog Timeout');
  }

  public simulateSdWriteFailure(): void {
    this.snmpConfigService.sendTrap('SD Card Error: Failed to write to file.');
    console.error('Simulated SD Card Write Failure.');
  }

  private startWatchdog() {
    if (this.watchdogTimer !== null) return;
    const timeout = this.stateService.watchdogConfig().WATCHDOG_TIMEOUT;
    console.log(`Hardware Watchdog started with a timeout of ${timeout} seconds.`);
    this.watchdogTimer = window.setInterval(() => {
      const timeoutMillis = this.stateService.watchdogConfig().WATCHDOG_TIMEOUT * 1000;
      if (Date.now() - this.lastHeartbeat > timeoutMillis) {
        console.error('Hardware Watchdog timeout! Device unresponsive. Rebooting...');
        this.stopWatchdog();
        this.incrementWatchdogRebootsAndReboot();
      }
    }, 1000);
  }

  private stopWatchdog() {
    if (this.watchdogTimer !== null) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
      console.log('Hardware Watchdog stopped.');
    }
  }

  private startIcmpWatchdog() {
    this.stopIcmpWatchdog();
    const config = this.stateService.watchdogConfig();
    console.log(`ICMP Watchdog will start pinging ${config.WATCHDOG_IP} after a delay of ${config.WATCHDOG_ICMP_DELAY} seconds.`);
    
    this.icmpWatchdogInitialDelayTimer = window.setTimeout(() => {
      console.log(`ICMP Watchdog initial delay finished. Starting periodic pings every ${config.WATCHDOG_ICMP_INTERVAL} seconds.`);
      this.simulatePing();
      this.icmpWatchdogTimer = window.setInterval(() => {
        this.simulatePing();
      }, config.WATCHDOG_ICMP_INTERVAL * 1000);
    }, config.WATCHDOG_ICMP_DELAY * 1000);
  }

  private stopIcmpWatchdog() {
    if (this.icmpWatchdogInitialDelayTimer !== null) {
      clearTimeout(this.icmpWatchdogInitialDelayTimer);
      this.icmpWatchdogInitialDelayTimer = null;
    }
    if (this.icmpWatchdogTimer !== null) {
      clearInterval(this.icmpWatchdogTimer);
      this.icmpWatchdogTimer = null;
    }
    if (this.icmpFailureCount > 0) {
      console.log('ICMP Watchdog stopped. Failure count reset.');
    }
    this.icmpFailureCount = 0;
  }

  private simulatePing() {
    const config = this.stateService.watchdogConfig();
    const ip = config.WATCHDOG_IP;
    const success = true;

    if (success) {
      console.log(`ICMP Ping to ${ip}: Success.`);
      this.systemLogService.addSystemLog('DEBUG', `ICMP Ping to ${ip}: Success.`);
      if (this.icmpFailureCount > 0) {
        this.systemLogService.addSystemLog('INFO', `ICMP Watchdog target ${ip} is responsive again.`);
      }
      this.icmpFailureCount = 0;
    } else {
      this.icmpFailureCount++;
      const msg = `ICMP Ping to ${ip}: Failed (Attempt ${this.icmpFailureCount}/${config.WATCHDOG_ICMP_FAIL_COUNT}).`;
      console.warn(msg);
      this.systemLogService.addSystemLog('WARN', msg);

      if (this.icmpFailureCount >= config.WATCHDOG_ICMP_FAIL_COUNT) {
        const errorMsg = `ICMP Watchdog: Target ${ip} unresponsive. Rebooting device.`;
        console.error(errorMsg);
        this.systemLogService.addSystemLog('ERROR', errorMsg);
        this.stopIcmpWatchdog();
        this.rebootDevice('ICMP Watchdog Timeout');
      }
    }
  }
}