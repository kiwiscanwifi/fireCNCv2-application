/**
 * @file src/services/alexa.service.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Simulates an Alexa integration (like Espalexa) for controlling the device.
 */
import { Injectable, signal, WritableSignal, effect, computed, Signal, inject } from '@angular/core';
import { ArduinoService, AlexaConfig, LedsState, LedState } from './arduino.service';
import { WebSocketService } from './websocket.service';
import { ConfigFileService } from './config-file.service';

export interface AlexaNotification {
  title: string;
  message: string;
}

export interface AlexaAnnouncement {
  timestamp: Date;
  message: string;
}

export type AlexaDeviceType = 'Dimmable Light' | 'Color Light' | 'Switch' | 'Contact Sensor' | 'Motion Sensor';

export interface AlexaDevice {
  name: string;
  type: AlexaDeviceType;
  state: {
    on: boolean;
    brightness?: number; // 0-100 for Alexa, maps to 0-255
    color?: string; // hex
  };
  // A unique key for internal tracking
  key: string; 
}

@Injectable({
  providedIn: 'root',
})
export class AlexaService {
  private arduinoService = inject(ArduinoService);
  private webSocketService = inject(WebSocketService);
  private configFileService = inject(ConfigFileService);
  
  config: Signal<AlexaConfig> = this.arduinoService.alexaConfig;
  devices: WritableSignal<AlexaDevice[]> = signal([]);
  announcements: WritableSignal<AlexaAnnouncement[]> = signal([]);
  lastNotification: WritableSignal<AlexaNotification | null> = signal(null);

  isAlexaEnabled: Signal<boolean> = computed(() => this.config().ENABLED);

  private lastOnboardLedColor = '#FFFFFF'; // Default to white

  constructor() {
    // Initialize lastOnboardLedColor from the current state if it's not 'off'
    const initialLedState = this.arduinoService.onboardLed();
    if (initialLedState.color !== 'off') {
        this.lastOnboardLedColor = initialLedState.color;
    }

    // Effect to handle device discovery when Alexa is enabled/disabled or config changes
    effect(() => {
      if (this.isAlexaEnabled()) {
        this.discoverDevices();
      } else {
        this.devices.set([]);
      }
    });

    // Effect to announce when the device connects
    effect(() => {
        const status = this.webSocketService.connectionStatus();
        if (status === 'connected' && this.isAlexaEnabled()) {
            this.announce(`${this.config().ANNOUNCE_DEVICE} has powered on.`);
        }
    });

    // Effect to sync device state with arduinoService state
    effect(() => {
        const onboardLedState = this.arduinoService.onboardLed();
        const buzzerState = this.arduinoService.buzzerEnabled();
        const masterLedsState = this.arduinoService.ledsState(); // Use runtime state

        this.devices.update(currentDevices => {
            return currentDevices.map(device => {
                switch(device.key) {
                    case 'onboardLed':
                        return { ...device, state: { on: onboardLedState.color !== 'off', brightness: Math.round(onboardLedState.brightness / 2.55), color: onboardLedState.color }};
                    case 'buzzer':
                        return { ...device, state: { ...device.state, on: buzzerState }};
                    case 'ledx_brightness':
                    case 'ledy_brightness':
                    case 'ledyy_brightness':
                         return { ...device, state: { 
                             on: masterLedsState.power, 
                             brightness: Math.round(masterLedsState.brightness / 2.55), 
                             color: masterLedsState.color 
                            }};
                    default:
                        return device;
                }
            });
        });
    });
  }

  private discoverDevices(): void {
    const config = this.config();
    const masterLedColor = this.arduinoService.ledsState().color;
    const newDevices: AlexaDevice[] = [
      { key: 'onboardLed', name: config.ONBOARD_LED_DEVICE, type: 'Color Light', state: { on: false, brightness: 100, color: '#FFFFFF' } },
      { key: 'buzzer', name: config.SYSTEM_BUZZER_DEVICE, type: 'Switch', state: { on: this.arduinoService.buzzerEnabled() } },
      { key: 'ledx_brightness', name: config.LEDX_BRIGHTNESS_DEVICE, type: 'Color Light', state: { on: true, brightness: 50, color: masterLedColor } },
      { key: 'ledy_brightness', name: config.LEDY_BRIGHTNESS_DEVICE, type: 'Color Light', state: { on: true, brightness: 50, color: masterLedColor } },
      { key: 'ledyy_brightness', name: config.LEDYY_BRIGHTNESS_DEVICE, type: 'Color Light', state: { on: true, brightness: 50, color: masterLedColor } },
      { key: 'shutdown', name: config.SHUTDOWN_DEVICE, type: 'Switch', state: { on: false } },
      { key: 'chase_effect', name: config.CHASE_EFFECT_DEVICE, type: 'Switch', state: { on: false } },
    ];
    this.devices.set(newDevices);
    console.log('Alexa devices discovered:', newDevices);
  }

  setDeviceState(deviceKey: string, newState: Partial<{ on: boolean; brightness: number; color: string }>): void {
     if (!this.isAlexaEnabled()) return;

     console.log(`[Alexa SIM] Setting state for ${deviceKey}:`, newState);

     switch (deviceKey) {
        case 'onboardLed': {
            const updates: Partial<LedState> = {};
            const currentLedState = this.arduinoService.onboardLed();
        
            // Handle brightness change
            if (newState.brightness !== undefined) {
                updates.brightness = Math.round(newState.brightness * 2.55);
            }
        
            // Handle color change
            if (newState.color !== undefined) {
                updates.color = newState.color;
                this.lastOnboardLedColor = newState.color; // Remember new color
            }
        
            // Handle power state change (on/off)
            if (newState.on !== undefined) {
                if (newState.on) { // Turning ON
                    // Only change color if it's currently off, restore last color
                    if (currentLedState.color === 'off') {
                        updates.color = this.lastOnboardLedColor;
                    }
                } else { // Turning OFF
                    // Remember the color before turning off
                    if (currentLedState.color !== 'off') {
                        this.lastOnboardLedColor = currentLedState.color;
                    }
                    updates.color = 'off';
                }
            }
            
            // A manual color or brightness change should stop any system-driven flashing
            if (newState.color !== undefined || newState.brightness !== undefined) {
                updates.flashing = false;
            }
        
            if (Object.keys(updates).length > 0) {
                this.arduinoService.updateOnboardLedState(updates);
            }
            break;
        }
        case 'buzzer':
            if (this.arduinoService.buzzerEnabled() !== newState.on) {
                this.arduinoService.toggleBuzzer();
            }
            break;
        case 'shutdown':
            if (newState.on) {
                // First, update the state to ON so the UI can react
                this.devices.update(d => d.map(dev => dev.key === 'shutdown' ? {...dev, state: {...dev.state, on: true}} : dev));
                
                this.arduinoService.rebootDevice();

                // After a short delay, reset the state to OFF to act as a momentary switch
                setTimeout(() => {
                    this.devices.update(d => d.map(dev => dev.key === 'shutdown' ? {...dev, state: {...dev.state, on: false}} : dev));
                }, 200);
            }
            break;
        case 'chase_effect':
            if (newState.on) {
                // First, update the state to ON so the UI can react
                this.devices.update(d => d.map(dev => dev.key === 'chase_effect' ? {...dev, state: {...dev.state, on: true}} : dev));

                this.arduinoService.updateLedsState({ effect: 'Chase', power: true });
                 // After a short delay, reset the state to OFF to act as a momentary switch
                 setTimeout(() => {
                    this.devices.update(d => d.map(dev => dev.key === 'chase_effect' ? {...dev, state: {...dev.state, on: false}} : dev));
                }, 200);
            }
            break;
        case 'ledx_brightness':
        case 'ledy_brightness':
        case 'ledyy_brightness': { // Using a block to scope variables
            const updates: Partial<LedsState> = {};
            if (newState.brightness !== undefined) {
                updates.brightness = Math.round(newState.brightness * 2.55);
            }
            if (newState.color !== undefined) {
                updates.color = newState.color;
                updates.effect = 'Solid'; // Setting color implies a solid effect
            }
            if (newState.on !== undefined) {
                updates.power = newState.on;
            }
            if (Object.keys(updates).length > 0) {
              this.arduinoService.updateLedsState(updates);
            }
            break;
        }
     }
  }

  setAlexaEnabled(enabled: boolean): void {
    const currentConfig = this.config();
    if (currentConfig.ENABLED !== enabled) {
      this.configFileService.updateAlexaConfig({ ...currentConfig, ENABLED: enabled });
    }
  }

  announce(message: string): void {
    if (!this.isAlexaEnabled()) return;
    
    const newAnnouncement: AlexaAnnouncement = { timestamp: new Date(), message };
    this.announcements.update(a => [newAnnouncement, ...a].slice(0, 50));
    
    this.lastNotification.set({ title: 'Alexa Announcement', message });
    setTimeout(() => this.lastNotification.set(null), 3000);
    console.log(`[Alexa SIM] Announcing: ${message}`);
  }
}