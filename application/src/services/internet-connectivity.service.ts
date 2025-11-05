/**
 * @file src/services/internet-connectivity.service.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * A service to monitor the browser's internet connection status.
 */
import { Injectable, signal, WritableSignal, OnDestroy, effect } from '@angular/core';

export type InternetStatus = 'online' | 'offline';

@Injectable({
  providedIn: 'root',
})
export class InternetConnectivityService implements OnDestroy {
  status: WritableSignal<InternetStatus> = signal(navigator.onLine ? 'online' : 'offline');
  pingEnabled: WritableSignal<boolean> = signal(true); // NEW: Configurable ping check
  pingTarget: WritableSignal<string> = signal('8.8.8.8'); // NEW: Configurable ping target
  lastOnlineTimestamp: WritableSignal<number | null> = signal(null); // NEW: Last time we were successfully online
  lastPingSuccessTimestamp: WritableSignal<number | null> = signal(null); // NEW: Last successful ping
  
  private pingInterval: any; // Renamed from checkInterval for clarity

  constructor() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // NEW: Use an effect to react to ping settings
    effect(() => {
      const enabled = this.pingEnabled();
      const target = this.pingTarget();

      this.stopPingMonitor(); // Always clear previous interval

      if (enabled && target) {
        this.startPingMonitor();
      } else {
        // If ping is disabled or target is empty, rely only on navigator.onLine for status.
        // Perform an immediate check.
        this.status.set(navigator.onLine ? 'online' : 'offline');
        if (navigator.onLine) {
          this.lastOnlineTimestamp.set(Date.now());
        } else {
          this.lastOnlineTimestamp.set(null);
        }
      }
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.stopPingMonitor(); // Ensure cleanup
  }

  private handleOnline = (): void => {
    // Browser thinks we're online, but let's verify with an active check
    // as this event can be unreliable.
    this.checkConnection();
  };

  private handleOffline = (): void => {
    this.status.set('offline');
    this.lastOnlineTimestamp.set(null); // NEW: Clear timestamp on going offline
  };

  // NEW: Start/stop methods for the ping monitor
  private startPingMonitor(): void {
    this.stopPingMonitor(); // Ensure no multiple intervals
    this.checkConnection(); // Immediate check
    this.pingInterval = setInterval(() => this.checkConnection(), 30000); // Every 30 seconds
    console.log(`Internet connectivity: Pinging ${this.pingTarget()} every 30s.`);
  }

  private stopPingMonitor(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    console.log('Internet connectivity: Ping monitor stopped.');
  }

  private async checkConnection(): Promise<void> {
    const enabledPing = this.pingEnabled();
    const target = this.pingTarget();

    if (!navigator.onLine) {
      if (this.status() !== 'offline') {
        this.status.set('offline');
      }
      this.lastOnlineTimestamp.set(null); // NEW: Clear timestamp
      return;
    }

    if (enabledPing && target) {
      try {
        // Fetch a small, highly available resource from the ping target.
        // Using 'no-cors' mode means we can't inspect the response, but we don't need to.
        // Success is just the fetch not throwing a network error.
        await fetch(`https://${target}/favicon.ico?_=${new Date().getTime()}`, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store'
        });
        
        if (this.status() !== 'online') {
          this.status.set('online');
        }
        this.lastOnlineTimestamp.set(Date.now()); // NEW: Update last online time
        this.lastPingSuccessTimestamp.set(Date.now()); // NEW: Update last ping success time
      } catch (error) {
        // This will catch network errors (e.g., DNS resolution failure, no route to host)
        if (this.status() !== 'offline') {
          this.status.set('offline');
        }
        this.lastOnlineTimestamp.set(null); // NEW: Clear timestamp
      }
    } else {
      // Fallback to basic navigator.onLine check if ping is disabled or target is missing
      if (this.status() !== 'online') {
        this.status.set('online');
      }
      this.lastOnlineTimestamp.set(Date.now()); // NEW: Update last online time
      // lastPingSuccessTimestamp is not applicable here, keep its previous value or null
    }
  }

  // NEW: Method to update ping configuration
  public updateConfig(newConfig: { PING_ENABLED?: boolean; PING_TARGET?: string }): void {
    if (newConfig.PING_ENABLED !== undefined) {
      this.pingEnabled.set(newConfig.PING_ENABLED);
    }
    if (newConfig.PING_TARGET !== undefined) {
      this.pingTarget.set(newConfig.PING_TARGET);
    }
  }

  // NEW: Status utility methods for Internet Connectivity
  public getInternetStatusColorClass(): string {
    const currentStatus = this.status();
    switch (currentStatus) {
      case 'online':
        return 'bg-green-500';
      case 'offline':
        return 'bg-red-500';
    }
  }

  public getInternetStatusText(): string {
    const currentStatus = this.status();
    switch (currentStatus) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
    }
  }
}