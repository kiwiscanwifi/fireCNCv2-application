import { ChangeDetectionStrategy, Component, computed, Signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArduinoService, LedsState, LedEffect } from '../../services/arduino.service';

@Component({
  selector: 'app-light-controller',
  imports: [CommonModule],
  templateUrl: './light-controller.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LightControllerComponent {
  private arduinoService = inject(ArduinoService);
  
  ledsState: Signal<LedsState> = this.arduinoService.ledsState;
  
  ledEffects: LedEffect[] = ['Solid', 'Rainbow', 'Chase', 'Off'];

  masterBrightnessPercent: Signal<number> = computed(() => {
    return Math.round(this.ledsState().brightness / 2.55);
  });

  setPower(isOn: boolean): void {
    this.arduinoService.updateLedsState({ power: isOn });
  }

  setBrightness(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.arduinoService.updateLedsState({ brightness: value });
  }

  setEffect(effect: LedEffect): void {
    const power = effect !== 'Off';
    this.arduinoService.updateLedsState({ effect, power });
  }
}
