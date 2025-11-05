import { ChangeDetectionStrategy, Component, computed, Signal, inject, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArduinoService, SystemInfo, WifiConfig, WifiStatus, NetworkConfig } from '../../services/arduino.service';
import { SnmpConfigService } from '../../services/snmp-config.service';
import { AlexaService } from '../../services/alexa.service';
import { WebSocketService, ConnectionStatus } from '../../services/websocket.service';

@Component({
  selector: 'app-system-details',
  imports: [CommonModule],
  templateUrl: './system-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemDetailsComponent {
  protected arduinoService = inject(ArduinoService);
  private snmpConfigService = inject(SnmpConfigService);
  private alexaService = inject(AlexaService);
  protected webSocketService = inject(WebSocketService); // NEW: Inject WebSocketService
  
  systemInfo: Signal<SystemInfo> = this.arduinoService.systemInfo;
  isAgentEnabled: Signal<boolean> = computed(() => this.snmpConfigService.config().AGENT_ENABLED);
  isTrapsEnabled: Signal<boolean> = computed(() => this.snmpConfigService.config().TRAPS_ENABLED);
  isAlexaEnabled: Signal<boolean> = this.alexaService.isAlexaEnabled;

  // Expose WiFi related signals
  wifiConfig: Signal<WifiConfig> = this.arduinoService.wifiConfig;
  wifiStatus: Signal<WifiStatus> = this.arduinoService.wifiStatus;
  networkConfig: Signal<NetworkConfig> = this.arduinoService.networkConfig; // NEW: Expose networkConfig for AP IP

  // Simulated clients for AP mode
  simulatedApClients: WritableSignal<number> = signal(Math.floor(Math.random() * 5) + 1); // 1 to 5 clients

  // NEW: Computed signal for network display information
  networkDisplayInfo = computed(() => {
    const systemInfo = this.systemInfo();
    const wifiConfig = this.wifiConfig();
    const wifiStatus = this.wifiStatus();
    const networkConfig = this.networkConfig();
    const ethernetConnectionStatus = this.webSocketService.connectionStatus(); // This typically represents Ethernet

    let label = 'IP Address';
    let value = systemInfo.ipAddress; // Default to the main system IP
    let icon = 'fa-solid fa-ethernet';
    let colorClass = 'text-gray-500'; // Default to grayed out if no active connection
    let suffix = '';

    // 1. Check if Ethernet is the active connection
    if (ethernetConnectionStatus === 'connected') {
      label = 'Ethernet IP'; // More specific label
      value = systemInfo.ipAddress; // This is the IP assigned to the main interface
      icon = 'fa-solid fa-ethernet';
      colorClass = 'text-green-400'; // Indicate active Ethernet
    } 
    // 2. Check if WiFi is the active connection (only if Ethernet is NOT connected)
    else if (wifiConfig.MODE !== 'Disabled' && wifiStatus.status === 'connected') {
      icon = 'fa-solid fa-wifi';
      colorClass = this.arduinoService.getWifiSignalColorClass(); // Use existing logic, returns gray if disconnected

      if (wifiConfig.MODE === 'Station') {
        label = 'IP Address'; // User's request: "IP Address" for Station mode
        value = wifiStatus.allocatedIp;
        if (value === '0.0.0.0') {
          value = 'Not available';
          // If IP is not available, also make the color gray, overriding any signal strength color.
          colorClass = 'text-gray-500';
        }
        // Suffix should only be added if it's connected AND an IP is available
        suffix = (wifiStatus.status === 'connected' && value !== 'Not available') ? ` (${wifiStatus.signalStrength}%)` : '';
      } else { // AP Mode
        label = 'Wireless AP';
        value = networkConfig.AP_IP; // AP's own IP
        suffix = ` (${this.simulatedApClients()} clients)`;
      }
    } 
    // 3. If neither Ethernet nor active WiFi (or WiFi disabled), use generic defaults
    // The 'value' is already systemInfo.ipAddress (likely 0.0.0.0 if not connected).
    // The 'colorClass' is already 'text-gray-500'.
    // The 'icon' is already 'fa-solid fa-ethernet'.

    return { label, value, icon, colorClass, suffix };
  });
}