import { ChangeDetectionStrategy, Component, Signal, inject, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WebSocketService, ConnectionStatus } from '../../services/websocket.service';
import { ArduinoService } from '../../services/arduino.service';
import { InternetConnectivityService, InternetStatus } from '../../services/internet-connectivity.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

type StatusType = 'internet' | 'esp32' | 'linuxcnc';

@Component({
  selector: 'app-status-details',
  imports: [CommonModule, DatePipe, RouterLink],
  templateUrl: './status-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusDetailsComponent {
  private route = inject(ActivatedRoute);
  private webSocketService = inject(WebSocketService); // Keep for direct signal access where needed
  protected arduinoService = inject(ArduinoService); // Changed to protected for direct access in template
  protected internetConnectivityService = inject(InternetConnectivityService); // Changed to protected for direct access in template

  // Make statusType reactive to route parameter changes
  statusType: Signal<StatusType> = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('type') as StatusType)
    ),
    { initialValue: 'internet' as StatusType } // Provide an initial value for SSR or initial load
  );

  currentStatusText: Signal<string> = computed(() => {
    switch (this.statusType()) {
      case 'internet': return this.internetConnectivityService.getInternetStatusText();
      case 'esp32': return this.arduinoService.getStatusText();
      case 'linuxcnc': return this.arduinoService.getLinuxCncStatusText();
      default: return 'Unknown';
    }
  });

  currentStatusColorClass: Signal<string> = computed(() => {
    switch (this.statusType()) {
      case 'internet': return this.internetConnectivityService.getInternetStatusColorClass();
      case 'esp32': return this.arduinoService.getStatusColorClass();
      case 'linuxcnc': return this.arduinoService.getLinuxCncStatusColorClass();
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

  detailTitle: Signal<string> = computed(() => {
    switch (this.statusType()) {
      case 'internet': return 'Internet Connectivity';
      case 'esp32': return 'ESP32 (Main Controller)';
      case 'linuxcnc': return 'LinuxCNC Machine Controller';
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
  lastPingSuccess: Signal<number | null> = this.internetConnectivityService.lastPingSuccessTimestamp;
}