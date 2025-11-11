import { ChangeDetectionStrategy, Component, signal, WritableSignal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SafeHtml } from '@angular/platform-browser';
import { MarkdownService } from '../../services/markdown.service';
import { ArduinoService } from '../../services/arduino.service';
import { WebSocketService } from '../../services/websocket.service';
import { SnmpService } from '../../services/snmp.service';
import { ConfigManagementService } from '../../services/config-management.service';

declare var CodeMirror: any;

interface PathParam {
  name: string;
  placeholder: string;
  currentValue: WritableSignal<string>;
}

interface PathPart {
  isParam: boolean;
  text?: string;
  param?: PathParam;
}

interface Endpoint {
  path: string;
  method?: string;
  description: string;
  examplePanelOpen?: boolean;
  requestBody?: string;
  responseBody?: string;
  liveResponse?: WritableSignal<string | null>;
  isLoading?: WritableSignal<boolean>;
  isEditable?: boolean;
  pathParams?: PathParam[];
}

interface EndpointCategory {
  title: string;
  icon: string;
  endpoints: Endpoint[];
}

@Component({
  selector: 'app-backend-endpoints',
  imports: [CommonModule, RouterLink],
  templateUrl: './backend-endpoints.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackendEndpointsComponent {
  private markdownService = inject(MarkdownService);
  protected arduinoService = inject(ArduinoService);
  protected webSocketService = inject(WebSocketService);
  private configManagementService = inject(ConfigManagementService);

  backendEndpointsCategory: WritableSignal<EndpointCategory | undefined> = signal(undefined);
  private editorInstances = new Map<string, any>();

  constructor() {
    const categoryData = this.getInitialCategory();
    const processedEndpoints = categoryData.endpoints.map(ep => {
      const pathParams = this.parsePathForParams(ep.path);
      return {
        ...ep,
        pathParams,
        liveResponse: signal<string | null>(null),
        isLoading: signal(false),
        isEditable: !!(ep.method === 'POST' && ep.requestBody)
      };
    });
    this.backendEndpointsCategory.set({ ...categoryData, endpoints: processedEndpoints });
  }

  private parsePathForParams(path: string): PathParam[] | undefined {
    const paramRegex = /\{(\w+)\}/g;
    let match;
    const params: PathParam[] = [];

    while ((match = paramRegex.exec(path)) !== null) {
      const paramName = match[1];
      let placeholder = paramName;
      if (paramName === 'index') placeholder = '0-7';
      
      params.push({
        name: paramName,
        placeholder: placeholder,
        currentValue: signal('0')
      });
    }

    return params.length > 0 ? params : undefined;
  }

  getEditorId(endpointIndex: number): string {
    return `editor-backend-${endpointIndex}`;
  }

  getPathParts(path: string, params: PathParam[]): PathPart[] {
    const paramRegex = /\{(\w+)\}/g;
    const parts: PathPart[] = [];
    let lastIndex = 0;
    let match;
  
    while ((match = paramRegex.exec(path)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ isParam: false, text: path.substring(lastIndex, match.index) });
      }
  
      const paramName = match[1];
      const param = params.find(p => p.name === paramName);
      if (param) {
        parts.push({ isParam: true, param: param });
      }
  
      lastIndex = match.index + match[0].length;
    }
  
    if (lastIndex < path.length) {
      parts.push({ isParam: false, text: path.substring(lastIndex) });
    }
  
    return parts;
  }

  onParamChange(param: PathParam, event: Event): void {
    param.currentValue.set((event.target as HTMLInputElement).value);
  }

  async tryEndpoint(endpoint: Endpoint): Promise<void> {
    if (!endpoint.isLoading || !endpoint.liveResponse) return;

    endpoint.examplePanelOpen = true;
    endpoint.isLoading.set(true);
    endpoint.liveResponse.set(null);

    if (this.webSocketService.connectionStatus() !== 'connected') {
      const errorResponse = { timestamp: new Date().toISOString(), error: 'WebSocket is not connected.' };
      endpoint.liveResponse.set(JSON.stringify(errorResponse, null, 2));
      endpoint.isLoading.set(false);
      return;
    }
    
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

    if (endpoint.method === 'GET') {
      let responseData: unknown = null;
      switch (endpoint.path) {
          case '/api/system-info': responseData = this.arduinoService.systemInfo(); break;
          case '/api/sd-card-info': responseData = this.arduinoService.sdCardInfo(); break;
          case '/api/health-stats': responseData = this.arduinoService.healthStats(); break;
          case '/api/digital-inputs': responseData = this.arduinoService.digitalInputs(); break;
          case '/api/digital-outputs': responseData = this.arduinoService.digitalOutputs(); break;
          case '/api/wifi-status': responseData = this.arduinoService.wifiStatus(); break;
          default: responseData = { error: 'Live request for this endpoint is not implemented.' }; break;
      }
      endpoint.liveResponse.set(JSON.stringify({ timestamp: new Date().toISOString(), data: responseData }, null, 2));
    } else if (endpoint.method === 'POST') {
      const editor = this.editorInstances.get(endpoint.path);
      let parsedJson: any = {};
      if (endpoint.isEditable && editor) {
        try {
          parsedJson = JSON.parse(editor.getValue());
        } catch (e) {
          endpoint.liveResponse.set(JSON.stringify({ timestamp: new Date().toISOString(), error: 'Invalid JSON.', details: (e as Error).message }, null, 2));
          endpoint.isLoading.set(false);
          return;
        }
      }

      let success = false;
      let message = 'Action simulated successfully.';
      let requiresCommit = false;

      try {
        switch (endpoint.path) {
          case '/api/digital-outputs/{index}/state': {
            const index = parseInt(endpoint.pathParams![0].currentValue(), 10);
            const state = parsedJson.state;
            if (!isNaN(index) && index >= 0 && index <= 7 && typeof state === 'boolean') {
              this.arduinoService.setDigitalOutput(index, state);
              message = `Digital output ${index} set to ${state ? 'ON' : 'OFF'}.`;
              success = true;
            } else {
              message = `Invalid index or state. Index: 0-7, State: boolean.`;
            }
            break;
          }
          case '/api/system/config': this.configManagementService.updateSystemConfig(parsedJson); requiresCommit = true; break;
          case '/api/network/config': 
            if (parsedJson.NETWORK) this.configManagementService.updateNetworkConfig(parsedJson.NETWORK);
            if (parsedJson.WIFI) this.configManagementService.updateWifiConfig(parsedJson.WIFI);
            requiresCommit = true; 
            break;
          case '/api/leds/state': this.arduinoService.updateLedsState(parsedJson); break;
          case '/api/onboard-led/state': this.arduinoService.updateOnboardLedState(parsedJson); break;
          case '/api/buzzer/toggle': this.arduinoService.toggleBuzzer(); break;
          case '/api/device/reboot': this.arduinoService.rebootDevice(parsedJson.reason || 'User Reboot from API'); message = 'Device reboot initiated.'; break;
          case '/api/device/shutdown': this.arduinoService.shutdownDevice(); message = 'Device shutdown initiated.'; break;
          case '/api/sd-card/write-failure': this.arduinoService.simulateSdWriteFailure(); message = 'SD card write failure simulated.'; break;
          default: message = 'Live request not implemented.'; break;
        }

        if (requiresCommit) {
          await this.configManagementService.commitChanges(false);
          message = 'Configuration updated successfully.';
          success = true;
        } else if(message === 'Action simulated successfully.') {
          success = true;
        }
      } catch (e) {
        message = `Error during simulation: ${(e as Error).message}`;
      }

      endpoint.liveResponse.set(JSON.stringify({ timestamp: new Date().toISOString(), status: success ? 'OK' : 'Error', message }, null, 2));
    }
    endpoint.isLoading.set(false);
  }

  toggleExamplePanel(endpoint: Endpoint, epIndex: number): void {
    const isCurrentlyOpen = endpoint.examplePanelOpen;
    const wasJustOpened = !isCurrentlyOpen;
  
    // If opening, update the request body with fresh data *before* updating the signal
    if (wasJustOpened && endpoint.isEditable) {
      const watchdogConfig = this.arduinoService.watchdogConfig();
      const networkConfig = this.arduinoService.networkConfig();
      const wifiConfig = this.arduinoService.wifiConfig();
      const ledsState = this.arduinoService.ledsState();
      const onboardLed = this.arduinoService.onboardLed();
  
      switch (endpoint.path) {
        case '/api/system/config': endpoint.requestBody = JSON.stringify(watchdogConfig, null, 2); break;
        case '/api/network/config': endpoint.requestBody = JSON.stringify({ NETWORK: networkConfig, WIFI: wifiConfig }, null, 2); break;
        case '/api/leds/state': endpoint.requestBody = JSON.stringify(ledsState, null, 2); break;
        case '/api/onboard-led/state': endpoint.requestBody = JSON.stringify(onboardLed, null, 2); break;
      }
    }
  
    // Update the signal to toggle the panel's visibility
    this.backendEndpointsCategory.update(category => {
      if (!category) return undefined;
      return {
        ...category,
        endpoints: category.endpoints.map(ep => ({ ...ep, examplePanelOpen: ep.path === endpoint.path ? !isCurrentlyOpen : false }))
      };
    });
  
    if (wasJustOpened && endpoint.isEditable) {
      // Defer CodeMirror initialization until after the DOM has been updated by Angular
      setTimeout(() => {
        const editorId = this.getEditorId(epIndex);
        const hostElement = document.getElementById(editorId);
        if (hostElement) {
          // Always create a new editor instance. Clear any previous content.
          hostElement.innerHTML = '';
          const editor = CodeMirror(hostElement, {
            value: endpoint.requestBody,
            lineNumbers: true,
            theme: 'dracula',
            mode: { name: 'javascript', json: true },
            lineWrapping: true
          });
          // Store the new instance to retrieve its value later
          this.editorInstances.set(endpoint.path, editor);
          // Refreshing after initialization in a timeout is a good practice for CodeMirror
          editor.refresh();
        }
      }, 0);
    } else if (!wasJustOpened) {
      // If we just closed the panel, remove the editor instance from our map
      // to prevent memory leaks and ensure a fresh one is created next time.
      this.editorInstances.delete(endpoint.path);
    }
  }

  parseMarkdown(content: string): SafeHtml {
    return this.markdownService.parse(content);
  }

  private getInitialCategory(): EndpointCategory {
    return {
      title: 'Simulated Backend Endpoints (Conceptual)',
      icon: 'fa-solid fa-server',
      endpoints: [
        {
          path: 'ws://device_ip:port',
          method: 'WebSocket',
          description: 'Real-time communication channel for logs, I/O updates, and commands.',
          responseBody: JSON.stringify({ type: 'log', timestamp: '2024-08-08T12:00:00Z', message: 'fireCNC Connected' }, null, 2),
          requestBody: JSON.stringify({ command: 'set_do', index: 0, state: true }, null, 2)
        },
        { path: '/api/digital-outputs/{index}/state', method: 'POST', description: 'Set the state of a specific digital output (0-7).', requestBody: JSON.stringify({ state: true }, null, 2), responseBody: JSON.stringify({ status: 'OK', message: 'Digital output 0 set to ON' }, null, 2) },
        { path: '/api/buzzer/toggle', method: 'POST', description: 'Toggle the onboard buzzer state.', requestBody: '{}', responseBody: JSON.stringify({ status: 'OK', enabled: true }, null, 2) },
        { path: '/api/system/config', method: 'POST', description: 'Update parts of the system configuration (watchdog, firmware, access code, text selection, etc.).', requestBody: `{}`, responseBody: JSON.stringify({ status: 'OK', message: 'System config updated successfully.' }, null, 2) },
        { path: '/api/network/config', method: 'POST', description: 'Update Ethernet, Wi-Fi, and other network-related configurations.', requestBody: `{}`, responseBody: JSON.stringify({ status: 'OK', message: 'Network and Wi-Fi configurations updated.' }, null, 2) },
        { path: '/api/leds/state', method: 'POST', description: 'Set the global state of the LED strips (power, brightness, color, effect).', requestBody: `{}`, responseBody: JSON.stringify({ status: 'OK', message: 'LED strip state updated.' }, null, 2) },
        { path: '/api/onboard-led/state', method: 'POST', description: 'Set the state of the onboard LED (color, brightness, flashing).', requestBody: `{}`, responseBody: JSON.stringify({ status: 'OK', message: 'Onboard LED state updated.' }, null, 2) },
        { path: '/api/device/reboot', method: 'POST', description: 'Initiate a device reboot. Can specify a reason.', requestBody: JSON.stringify({ reason: 'User Reboot' }, null, 2), responseBody: JSON.stringify({ status: 'OK', message: 'Device reboot initiated.' }, null, 2) },
        { path: '/api/device/shutdown', method: 'POST', description: 'Initiate a device shutdown sequence.', requestBody: '{}', responseBody: JSON.stringify({ status: 'OK', message: 'Device shutdown initiated.' }, null, 2) },
        { path: '/api/sd-card/write-failure', method: 'POST', description: 'Simulate an SD card write failure for testing error handling.', requestBody: '{}', responseBody: JSON.stringify({ status: 'OK', message: 'SD card write failure simulated.' }, null, 2) },
        { path: '/api/system-info', method: 'GET', description: 'Retrieve current system information.', responseBody: JSON.stringify({ firmwareVersion: 'v0.0.5', firmwareDate: '2024-08-07', uptime: '0d 1h 30m 5s', ipAddress: '192.168.1.20', sshEnabled: true }, null, 2) },
        { path: '/api/sd-card-info', method: 'GET', description: 'Retrieve SD card status and usage statistics.', responseBody: JSON.stringify({ status: 'Mounted', usedGb: 14.8, totalGb: 15.9 }, null, 2) },
        { path: '/api/health-stats', method: 'GET', description: 'Retrieve system health statistics including startup count and watchdog reboots.', responseBody: JSON.stringify({ startups: 5, watchdogReboots: 1 }, null, 2) },
        { path: '/api/digital-inputs', method: 'GET', description: 'Retrieve the current states of all digital inputs.', responseBody: JSON.stringify([true, false, true, false, false, false, false, false], null, 2) },
        { path: '/api/digital-outputs', method: 'GET', description: 'Retrieve the current states of all digital outputs.', responseBody: JSON.stringify([false, true, false, false, false, false, false, false], null, 2) },
        { path: '/api/wifi-status', method: 'GET', description: 'Retrieve the current Wi-Fi connection status, signal strength, and allocated IP details.', responseBody: JSON.stringify({ status: 'connected', signalStrength: 75, allocatedIp: '192.168.1.105', allocatedSubnet: '255.255.255.0', allocatedGateway: '192.168.1.1' }, null, 2) },
        { path: 'SNMP Trap', method: 'UDP', description: 'The device sends SNMP trap notifications for system events like high storage usage or log entries above a configured level.', requestBody: JSON.stringify({ oid: '1.3.6.1.4.1.55555.1.2.1.0', value: 'High Storage Usage: SD Card usage is at 85.0%', community: 'SNMP_trap' }, null, 2) },
        { path: 'SNMP GET / OID', method: 'UDP', description: 'Retrieve specific system metrics by querying their SNMP Object Identifiers (OIDs).', responseBody: JSON.stringify({ oid: '1.3.6.1.4.1.55555.1.1.1.0', value: '3.28V' }, null, 2) },
        { path: 'localStorage', method: 'Read/Write', description: 'Browser-based persistent storage used as a fallback for app data and config.' },
        { path: 'https://{pingTarget}/generate_204', method: 'HEAD', description: 'External endpoint for internet connectivity ping checks. A successful HEAD request indicates online status.', responseBody: 'HTTP/1.1 204 No Content' },
      ],
    };
  }
}