/**
 * @file src/components/light-controller/light-controller.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * OBSOLETE: Component for managing and displaying the state of the digital outputs (DO)
 * on the fireCNC board. This component is not standalone and has been replaced by
 * `src/components/digital-outputs/digital-outputs.component.ts`.
 */
import { ChangeDetectionStrategy, Component, Signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArduinoService } from '../../services/arduino.service';

@Component({
  selector: 'app-obsolete-light-controller',
  templateUrl: './light-controller.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class ObsoleteLightControllerComponent {
  private arduinoService = inject(ArduinoService);
  digitalOutputs: Signal<boolean[]> = this.arduinoService.digitalOutputs;

  toggleOutput(index: number): void {
    const currentState = this.digitalOutputs()[index];
    this.arduinoService.setDigitalOutput(index, !currentState);
  }
}