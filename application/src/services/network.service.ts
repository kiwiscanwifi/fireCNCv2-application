import { Injectable, signal, WritableSignal, OnDestroy, effect, inject } from '@angular/core';
import { WebSocketService, ConnectionStatus } from './websocket.service';
import { StateService, WifiStatus } from './state.service';

@Injectable({
  providedIn: 'root',
})
export class NetworkService implements OnDestroy {
  private webSocketService = inject(WebSocketService);
  private stateService = inject(StateService);
  
  private wifiSimulationInterval: number | null = null;
  
  // State is now managed by StateService
  private wifiStatus = this.stateService.wifiStatus;
  private linuxCncConnectionStatus = this.stateService.linuxCncConnectionStatus;
  private linuxCncLastConnectedTimestamp = this.stateService.linuxCncLastConnectedTimestamp;
  private linuxCncLastFailedTimestamp = this.stateService.linuxCncLastFailedTimestamp;

  constructor() {
    effect(() => {
      const ethStatus = this.webSocketService.connectionStatus();
      const wifiMode = this.stateService.wifiConfig().MODE;

      if (wifiMode === 'Disabled') {
        this.stopWifiSimulation();
        this.wifiStatus.set({ status: 'disabled', signalStrength: 0, allocatedIp: '0.0.0.0', allocatedSubnet: '0.0.0.0', allocatedGateway: '0.0.0.0' });
      } else if (ethStatus === 'connected') {
        this.stopWifiSimulation();
        this.wifiStatus.set({ status: 'disconnected', signalStrength: 0, allocatedIp: '0.0.0.0', allocatedSubnet: '0.0.0.0', allocatedGateway: '0.0.0.0' });
      } else if (ethStatus === 'disconnected' && wifiMode === 'Station') {
        this.startWifiSimulation();
      } else if (ethStatus === 'disconnected' && wifiMode === 'AP') {
        this.stopWifiSimulation();
        const netConf = this.stateService.networkConfig();
        this.wifiStatus.set({ 
          status: 'connected',
          signalStrength: 100,
          allocatedIp: netConf.AP_IP,
          allocatedSubnet: netConf.AP_SUBNET,
          allocatedGateway: netConf.AP_IP
        });
      }
    });

    effect(() => {
      if (this.webSocketService.connectionStatus() === 'connected') {
        window.setTimeout(() => {
          this.linuxCncConnectionStatus.set('connecting');
          window.setTimeout(() => {
            this.linuxCncConnectionStatus.set('connected');
            this.linuxCncLastConnectedTimestamp.set(Date.now());
            this.linuxCncLastFailedTimestamp.set(null);
          }, 2000);
        }, 1500);
      } else {
        this.linuxCncConnectionStatus.set('disconnected');
        this.linuxCncLastConnectedTimestamp.set(null);
        this.linuxCncLastFailedTimestamp.set(Date.now());
      }
    });
  }

  ngOnDestroy(): void {
    this.stopWifiSimulation();
  }

  private startWifiSimulation(): void {
    if (this.wifiSimulationInterval !== null) return;
    
    window.setTimeout(() => {
      const wifiConf = this.stateService.wifiConfig();
      let status: WifiStatus;

      if (wifiConf.IP_ASSIGNMENT === 'DHCP') {
        status = { 
          status: 'connected', 
          signalStrength: 75,
          allocatedIp: '192.168.1.105',
          allocatedSubnet: '255.255.255.0',
          allocatedGateway: '192.168.1.1'
        };
      } else {
        status = { 
          status: 'connected', 
          signalStrength: 80,
          allocatedIp: wifiConf.STATIC_IP,
          allocatedSubnet: wifiConf.SUBNET,
          allocatedGateway: wifiConf.GATEWAY_IP
        };
      }
      
      this.wifiStatus.set(status);
      
      this.wifiSimulationInterval = window.setInterval(() => {
        this.wifiStatus.update(current => {
          if (current.status === 'connected') {
            const fluctuation = (Math.random() - 0.5) * 20;
            let newStrength = current.signalStrength + fluctuation;
            newStrength = Math.max(5, Math.min(100, newStrength));
            return { ...current, signalStrength: Math.round(newStrength) };
          }
          return current;
        });
      }, 3000);

    }, 2000);
  }

  private stopWifiSimulation(): void {
    if (this.wifiSimulationInterval !== null) {
      clearInterval(this.wifiSimulationInterval);
      this.wifiSimulationInterval = null;
    }
  }
}