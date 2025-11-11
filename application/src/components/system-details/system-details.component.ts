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

  // REFINED: Computed signal for network display information
  networkDisplayInfo = computed(() => {
    const systemInfo = this.systemInfo();
    const wifiConfig = this.wifiConfig();
    const wifiStatus = this.wifiStatus();
    const networkConfig = this.networkConfig();
    const ethernetConnectionStatus = this.webSocketService.connectionStatus();

    // Priority 1: Ethernet is active
    if (ethernetConnectionStatus === 'connected') {
        return {
            label: 'Ethernet IP',
            value: systemInfo.ipAddress,
            icon: 'fa-solid fa-ethernet',
            colorClass: 'text-green-400',
            suffix: ''
        };
    }
    
    // If Ethernet is not active, check Wi-Fi modes
    if (wifiConfig.MODE === 'AP') {
        // Priority 2: Wi-Fi Access Point is active
        return {
            label: 'Wireless AP',
            value: networkConfig.AP_IP,
            icon: 'fa-solid fa-wifi',
            colorClass: 'text-blue-400', // AP is always 'active' in its own way
            suffix: '' // Client count moved to template for consistency
        };
    }
    
    if (wifiConfig.MODE === 'Station') {
        // Priority 3: Wi-Fi Station status
        if (wifiStatus.status === 'connected' && wifiStatus.allocatedIp !== '0.0.0.0') {
            return {
                label: 'Wi-Fi IP',
                value: wifiStatus.allocatedIp,
                icon: 'fa-solid fa-wifi',
                colorClass: this.arduinoService.getWifiSignalColorClass(),
                suffix: ` (${wifiStatus.signalStrength}%)`
            };
        } else {
            // Station mode is on, but not connected
            return {
                label: 'Wi-Fi',
                value: 'Disconnected',
                icon: 'fa-solid fa-wifi',
                colorClass: 'text-gray-500',
                suffix: ''
            };
        }
    }

    // Fallback: No active connection and WiFi is disabled or not configured
    return {
        label: 'Network',
        value: 'Disconnected',
        icon: 'fa-solid fa-ethernet',
        colorClass: 'text-gray-500',
        suffix: ''
    };
  });
}