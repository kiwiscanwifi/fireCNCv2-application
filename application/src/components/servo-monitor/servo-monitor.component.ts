/**
 * @file src/components/servo-monitor/servo-monitor.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * OBSOLETE: Component for monitoring the state of the digital inputs (DI) on the
 * fireCNC board. This component is not standalone and has been replaced by
 * `src/components/digital-inputs/digital-inputs.component.ts`.
 */
import { ChangeDetectionStrategy, Component, Signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArduinoService } from '../../services/arduino.service';

@Component({
  selector: 'app-obsolete-servo-monitor',
  templateUrl: './servo-monitor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class ObsoleteServoMonitorComponent {
  private arduinoService = inject(ArduinoService);
  digitalInputs: Signal<boolean[]> = this.arduinoService.digitalInputs;
}