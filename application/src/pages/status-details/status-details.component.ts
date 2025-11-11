import { ChangeDetectionStrategy, Component, Signal, inject, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
// FIX: Import ParamMap to explicitly type the route parameter map.
import { ActivatedRoute, RouterLink, ParamMap } from '@angular/router';
import { WebSocketService, ConnectionStatus } from '../../services/websocket.service';
// FIX: Import InternetStatus from the arduino service facade
import { ArduinoService, SystemConfig, InternetStatus } from '../../services/arduino.service';
// FIX: Remove incorrect InternetStatus import from here
import { InternetConnectivityService } from '../../services/internet-connectivity.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { signal } from '@angular/core';

type StatusType = 'internet' | 'esp32' | 'linuxcnc';

@Component({
  selector: 'app-status-details',
  imports: [CommonModule, DatePipe, RouterLink],
  templateUrl: './status-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusDetailsComponent {
  // FIX: Explicitly type `route` as `ActivatedRoute` to resolve 'Property does not exist on type unknown' errors.
  private route: ActivatedRoute = inject(ActivatedRoute);
  protected webSocketService = inject(WebSocketService);
  protected arduinoService = inject(ArduinoService);
  protected internetConnectivityService = inject(InternetConnectivityService);

  // Make statusType reactive to route parameter changes
  statusType: Signal<StatusType> = toSignal(
    this.route.paramMap.pipe(
      // FIX: Explicitly type `params` as `ParamMap` to resolve 'Property 'get' does not exist on type unknown' error.
      map((params: ParamMap) => params.get('type') as StatusType)
    ),
    { initialValue: 'internet' as StatusType } // Provide an initial value for SSR or initial load
  );

  currentStatusText: Signal<string> = computed(() => {
    switch (this.statusType()) {
      case 'internet': return this.arduinoService.getConnectionStatusText(this.internetConnectivityService.status());
      case 'esp32': return this.arduinoService.getConnectionStatusText(this.webSocketService.connectionStatus());
      case 'linuxcnc': return this.arduinoService.getConnectionStatusText(this.arduinoService.linuxCncConnectionStatus());
      default: return 'Unknown';
    }
  });

  currentStatusColorClass: Signal<string> = computed(() => {
    switch (this.statusType()) {
      case 'internet': return this.arduinoService.getConnectionStatusColorClass(this.internetConnectivityService.status());
      case 'esp32': return this.arduinoService.getConnectionStatusColorClass(this.webSocketService.connectionStatus());
      case 'linuxcnc': return this.arduinoService.getConnectionStatusColorClass(this.arduinoService.linuxCncConnectionStatus());
      default: return 'bg-gray-500';
    }
  });

  lastConnectedTimestamp: Signal<number | null> = computed(() => {
    switch (this.statusType()) {
      case 'internet': return this.internetConnectivityService.lastOnlineTimestamp();
      case 'esp32': return this.webSocketService.lastConnectedTimestamp();
      case 'linuxcnc': return this.arduinoService.linuxCncLastConnectedTimestamp();
      default: return null;
    }
  });

  lastFailedConnectionTimestamp: Signal<number | null> = computed(() => {
    switch (this.statusType()) {
      case 'internet': return this.internetConnectivityService.lastFailedTimestamp();
      case 'esp32': return this.webSocketService.lastFailedTimestamp(); // NEW: Get from WebSocketService
      case 'linuxcnc': return this.arduinoService.linuxCncLastFailedTimestamp(); // NEW: Get from ArduinoService
      default: return null;
    }
  });

  detailTitle: Signal<string> = computed(() => {
    switch (this.statusType()) {
      case 'internet': return 'Internet Connectivity';
      case 'esp32': return 'ESP32 (fireCNC Controller)';
      case 'linuxcnc': return 'LinuxCNC';
      default: return 'Status Details';
    }
  });

  detailDescription: Signal<string> = computed(() => {
    switch (this.statusType()) {
      case 'internet': return `Monitors the device's connection to the broader internet. 
                              This check can use a simple browser-reported status or actively ping a configurable target.`;
      case 'esp32': return `Monitors the WebSocket connection to the main ESP32 controller board. 
                           This is the primary communication link for real-time data and commands.`;
      case 'linuxcnc': return `Monitors the simulated connection to the LinuxCNC machine controller. 
                               This indicates whether the ESP32 can communicate with the Linux-based CNC system.`;
      default: return 'Detailed information about this status.';
    }
  });

  // Specific details for Internet status
  pingEnabled: Signal<boolean> = this.internetConnectivityService.pingEnabled;
  pingTarget: Signal<string> = this.internetConnectivityService.pingTarget;
  // REMOVED: No longer need a direct signal for lastFailedConnectionTimestamp here, as it's handled by the computed above.

  // Computed signal for the full WebSocket URL for ESP32
  protected esp32WebsocketUrl = computed(() => {
    return this.arduinoService.watchdogConfig().WEBSOCKET_URL;
  });

  // NEW: Simulated LinuxCNC endpoint details (hardcoded for simulation)
  protected linuxCncMonitorIp: Signal<string> = signal('192.168.1.100');
  protected linuxCncMonitorExportingPort: Signal<number> = signal(5000); // Example port for data export
  protected linuxCncMonitorWebSocketUrl: Signal<string> = computed(() => `ws://${this.linuxCncMonitorIp()}:8080`); // Example WebSocket URL

  // UPDATED: Computed signal for "Next" button logic
  nextStatusRoute: Signal<string> = computed(() => {
    switch (this.statusType()) {
      case 'internet': return '/status/details/esp32';
      case 'esp32': return '/status/details/linuxcnc';
      case 'linuxcnc': 
        // If internet monitoring is enabled, link to internet monitoring.
        // Otherwise, loop back to ESP32 monitoring.
        return this.internetConnectivityService.pingEnabled() ? '/status/details/internet' : '/status/details/esp32';
      default: return '/dashboard'; // Fallback to dashboard if type is unknown
    }
  });

  // UPDATED: Button text will always be 'Next' for the cycle, or 'Close' if it exits to dashboard.
  buttonText: Signal<string> = computed(() => {
    // If the next route is explicitly to the dashboard, show 'Close'.
    // Otherwise, it's part of the cycle, so show 'Next'.
    return this.nextStatusRoute() === '/dashboard' ? 'Close' : 'Next';
  });
}
