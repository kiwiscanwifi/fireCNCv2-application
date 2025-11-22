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
import { NotificationService } from './notification.service';
import { InternetConnectivityService } from './internet-connectivity.service';
// FIX: Import StateService and Alexa-related types to break circular dependency and use centralized state.
import { StateService, AlexaDevice, AlexaAnnouncement, AlexaDeviceType } from './state.service';

// FIX: Re-export types for consumers of AlexaService
export type { AlexaDevice, AlexaAnnouncement };

@Injectable({
  providedIn: 'root',
})
export class AlexaService {
  private arduinoService = inject(ArduinoService);
  private webSocketService = inject(WebSocketService);
  private configFileService = inject(ConfigFileService);
  private notificationService = inject(NotificationService);
  private internetConnectivityService = inject(InternetConnectivityService);
  // FIX: Inject StateService to use its signals.
  private stateService = inject(StateService);
  
  config: Signal<AlexaConfig> = this.arduinoService.alexaConfig;
  // FIX: Use signals from the central StateService.
  devices = this.stateService.alexaDevices;
  announcements = this.stateService.alexaAnnouncements;

  isAlexaEnabled: Signal<boolean> = computed(() => this.config().ENABLED);

  private lastOnboardLedColor = '#FFFFFF'; // Default to white
  private hasAnnouncedPowerOn = signal(false);

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

    // Effect to announce when the device connects and has internet
    effect(() => {
        const wsStatus = this.webSocketService.connectionStatus();
        const internetStatus = this.internetConnectivityService.status();

        if (
            wsStatus === 'connected' &&
            internetStatus === 'online' &&
            this.isAlexaEnabled() &&
            !this.hasAnnouncedPowerOn()
        ) {
            this.announce(`${this.config().ANNOUNCE_DEVICE} has powered on.`, 'power_on');
            this.hasAnnouncedPowerOn.set(true);
        }
    });

    // Effect to reset the power on announcement flag when connection is lost
    effect(() => {
        const wsStatus = this.webSocketService.connectionStatus();
        if (wsStatus === 'disconnected' || wsStatus === 'restarting') {
            this.hasAnnouncedPowerOn.set(false);
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
                window.setTimeout(() => {
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
                 window.setTimeout(() => {
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

  announce(message: string, type: string): void {
    if (!this.isAlexaEnabled()) return;
    
    const newAnnouncement: AlexaAnnouncement = { timestamp: new Date(), message };
    this.announcements.update(a => [newAnnouncement, ...a].slice(0, 50));
    
    console.log(`[Alexa SIM] Announcing: ${message}`);

    const config = this.config();
    if (!config.ANNOUNCE_BANNERS_ENABLED) {
      return; // Master switch is off
    }

    const announcementTypes = config.ANNOUNCEMENT_TYPES || [];
    const announcementType = announcementTypes.find(t => t.key === type);
    
    if (announcementType && announcementType.enabled) {
      this.notificationService.showAlexa(message);
    }
  }
}