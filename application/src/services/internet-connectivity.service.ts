import { Injectable, signal, WritableSignal, OnDestroy, effect, inject } from '@angular/core';
import { StateService, InternetStatus } from './state.service';

@Injectable({
  providedIn: 'root',
})
export class InternetConnectivityService implements OnDestroy {
  private stateService = inject(StateService);
  
  // State is now managed by StateService
  status = this.stateService.internetStatus;
  pingEnabled = this.stateService.pingEnabled;
  pingTarget = this.stateService.pingTarget;
  lastOnlineTimestamp = this.stateService.lastOnlineTimestamp;
  lastPingSuccessTimestamp = this.stateService.lastPingSuccessTimestamp;
  lastFailedTimestamp = this.stateService.lastInternetFailedTimestamp;
  
  private pingInterval: any; // Renamed from checkInterval for clarity

  constructor() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    this.status.set(navigator.onLine ? 'online' : 'offline');


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
          this.lastFailedTimestamp.set(null); // Clear on direct online status if ping disabled
        } else {
          this.lastOnlineTimestamp.set(null);
          // Don't set lastFailedTimestamp here, it's specific to ping failures.
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
    this.lastFailedTimestamp.set(null); // NEW: Clear failed timestamp on going offline
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
      this.lastFailedTimestamp.set(null); // No ping, so no "failed"
      return;
    }

    if (enabledPing && target) {
      try {
        // Fetch a small, highly available resource from the ping target.
        // Using 'no-cors' mode means we can't inspect the response, but we don't need to.
        // Success is just the fetch not throwing a network error.
        await fetch(`https://${target}/generate_204?_=${new Date().getTime()}`, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store'
        });
        
        if (this.status() !== 'online') {
          this.status.set('online');
        }
        this.lastOnlineTimestamp.set(Date.now()); // NEW: Update last online time
        this.lastPingSuccessTimestamp.set(Date.now()); // NEW: Update last ping success time
        this.lastFailedTimestamp.set(null); // Clear last failed on success
      } catch (error) {
        // This will catch network errors (e.g., DNS resolution failure, no route to host)
        if (this.status() !== 'offline') {
          this.status.set('offline');
        }
        this.lastOnlineTimestamp.set(null); // NEW: Clear timestamp
        this.lastFailedTimestamp.set(Date.now()); // Set last failed on actual ping failure
      }
    } else {
      // Fallback to basic navigator.onLine check if ping is disabled or target is missing
      if (this.status() !== 'online') {
        this.status.set('online');
      }
      this.lastOnlineTimestamp.set(Date.now()); // NEW: Update last online time
      // lastPingSuccessTimestamp is not applicable here, keep its previous value or null
      this.lastFailedTimestamp.set(null); // No ping, so no "failed"
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
}
