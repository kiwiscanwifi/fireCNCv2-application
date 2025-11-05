/**
 * @file src/pages/alexa/alexa.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for the Alexa page, which provides a UI to simulate and monitor
 * Alexa-controlled devices.
 */
import { ChangeDetectionStrategy, Component, Signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AlexaService, AlexaDevice, AlexaAnnouncement } from '../../services/alexa.service';

@Component({
  selector: 'app-alexa-page',
  imports: [CommonModule, DatePipe, RouterLink],
  templateUrl: './alexa.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlexaPageComponent {
  alexaService = inject(AlexaService);
  devices: Signal<AlexaDevice[]> = this.alexaService.devices;
  announcements: Signal<AlexaAnnouncement[]> = this.alexaService.announcements;
  isAlexaEnabled: Signal<boolean> = this.alexaService.isAlexaEnabled;

  handleToggle(device: AlexaDevice): void {
    this.alexaService.setDeviceState(device.key, { on: !device.state.on });
  }

  handleBrightness(device: AlexaDevice, event: Event): void {
    const brightness = parseInt((event.target as HTMLInputElement).value, 10);
    this.alexaService.setDeviceState(device.key, { brightness });
  }

  handleColor(device: AlexaDevice, event: Event): void {
    const color = (event.target as HTMLInputElement).value;
    this.alexaService.setDeviceState(device.key, { color });
  }

  getIconForDevice(device: AlexaDevice): string {
    switch (device.key) {
        case 'onboardLed':
        case 'ledx_brightness':
        case 'ledy_brightness':
        case 'ledyy_brightness':
            return 'fa-solid fa-lightbulb';
        case 'buzzer': return 'fa-solid fa-volume-high';
        case 'shutdown': return 'fa-solid fa-power-off';
        case 'chase_effect': return 'fa-solid fa-star'; // A suitable replacement for a sparkle
        default: return 'fa-solid fa-sun';
    }
  }
}
