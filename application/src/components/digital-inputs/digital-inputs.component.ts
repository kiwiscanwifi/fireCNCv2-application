/**
 * @file src/components/digital-inputs/digital-inputs.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for monitoring the state of the digital inputs (DI) on the
 * fireCNC board, including their corresponding GPIO pin numbers.
 */
import { ChangeDetectionStrategy, Component, Signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArduinoService } from '../../services/arduino.service';

@Component({
  selector: 'app-digital-inputs',
  templateUrl: './digital-inputs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class DigitalInputsComponent {
  private arduinoService = inject(ArduinoService);

  private digitalInputsState: Signal<boolean[]> = this.arduinoService.digitalInputs;
  private digitalInputsConfig = this.arduinoService.digitalInputsConfig; // Use ArduinoService for config
  
  visibleInputs = computed(() => {
    const inputsState = this.digitalInputsState();
    const inputsConfig = this.digitalInputsConfig();
    const gpios = [4, 5, 6, 7, 8, 9, 10, 11];

    return inputsConfig
      .filter(config => config.enabled)
      .map(config => ({
        id: config.id,
        name: config.name,
        state: inputsState[config.id],
        gpio: gpios[config.id]
      }));
  });
}
