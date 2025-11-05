/**
 * @file src/pages/leds/leds.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for the LEDs page, which provides controls for the WS2815 LED strips.
 */
import { ChangeDetectionStrategy, Component, computed, Signal, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArduinoService, LedsConfig, LedsState, LedEffect, LedState } from '../../services/arduino.service';
import { ServoControlService, LedPixel } from '../../services/servo-control.service';

@Component({
  selector: 'app-leds-page',
  imports: [CommonModule],
  templateUrl: './leds.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LedsPageComponent {
  private arduinoService = inject(ArduinoService);
  private servoControlService = inject(ServoControlService);
  
  ledsConfig: Signal<LedsConfig> = this.arduinoService.ledsConfig;
  ledsState: Signal<LedsState> = this.arduinoService.ledsState;
  onboardLed: Signal<LedState> = this.arduinoService.onboardLed;
  
  private lastOnboardLedColor = signal<string>('#FFFFFF'); // Default to white
  
  totalLedCount: Signal<number> = computed(() => {
      const config = this.ledsConfig();
      return config.COUNT_X + config.COUNT_Y + config.COUNT_YY;
  });
  
  sampledLedStripX: Signal<LedPixel[]>;
  sampledLedStripY: Signal<LedPixel[]>;
  sampledLedStripYY: Signal<LedPixel[]>;
  
  private readonly RENDER_COUNT = 100;

  ledEffects: LedEffect[] = ['Solid', 'Rainbow', 'Chase', 'Off'];

  constructor() {
    this.sampledLedStripX = this.createSampledSignal(this.servoControlService.ledStripX);
    this.sampledLedStripY = this.createSampledSignal(this.servoControlService.ledStripY);
    this.sampledLedStripYY = this.createSampledSignal(this.servoControlService.ledStripYY);
  }

  private createSampledSignal(sourceSignal: Signal<LedPixel[]>): Signal<LedPixel[]> {
    return computed(() => {
      const source = sourceSignal();
      if (source.length <= this.RENDER_COUNT) {
        return source;
      }
      const sampled: LedPixel[] = [];
      const step = source.length / this.RENDER_COUNT;
      for (let i = 0; i < this.RENDER_COUNT; i++) {
        const index = Math.floor(i * step);
        sampled.push(source[index]);
      }
      return sampled;
    });
  }

  setPower(isOn: boolean): void {
    this.arduinoService.updateLedsState({ power: isOn });
  }

  setBrightness(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.arduinoService.updateLedsState({ brightness: value });
  }

  setColor(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.arduinoService.updateLedsState({ color: value });
  }

  setEffect(effect: LedEffect): void {
    const power = effect !== 'Off';
    this.arduinoService.updateLedsState({ effect, power });
  }

  setOnboardLedPower(isOn: boolean): void {
    const currentLedState = this.onboardLed();
    if (isOn) {
      // If it's currently off, turn it on to the last known color
      if (currentLedState.color === 'off') {
        this.arduinoService.updateOnboardLedState({ color: this.lastOnboardLedColor(), flashing: false });
      }
    } else {
      // If it's currently on, store its color and then turn it off
      if (currentLedState.color !== 'off') {
        this.lastOnboardLedColor.set(currentLedState.color);
        this.arduinoService.updateOnboardLedState({ color: 'off', flashing: false });
      }
    }
  }

  setOnboardLedBrightness(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.arduinoService.updateOnboardLedState({ brightness: value });
  }

  setOnboardLedColor(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    // When a new color is set, ensure the LED is considered "on" and stop any automatic flashing.
    this.arduinoService.updateOnboardLedState({ color: value, flashing: false });
    this.lastOnboardLedColor.set(value);
  }
}