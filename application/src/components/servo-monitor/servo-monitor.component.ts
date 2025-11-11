import { ChangeDetectionStrategy, Component, computed, Signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServoControlService, ServoState } from '../../services/servo-control.service';
import { ArduinoService, TableConfig } from '../../services/arduino.service';

@Component({
  selector: 'app-servo-monitor',
  imports: [CommonModule],
  templateUrl: './servo-monitor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServoMonitorComponent {
  private servoControlService = inject(ServoControlService);
  private arduinoService = inject(ArduinoService);
  
  servoX: Signal<ServoState> = this.servoControlService.servoX;
  servoY: Signal<ServoState> = this.servoControlService.servoY;
  servoYY: Signal<ServoState> = this.servoControlService.servoYY;
  servoZ: Signal<ServoState> = this.servoControlService.servoZ;

  tableConfig: Signal<TableConfig> = this.arduinoService.tableConfig;
  
  servoXPercent = computed(() => (this.servoX().position / this.tableConfig().RAIL_X) * 100);
  servoYPercent = computed(() => (this.servoY().position / this.tableConfig().RAIL_Y) * 100);
  servoYYPercent = computed(() => (this.servoYY().position / this.tableConfig().RAIL_Y) * 100);
  servoZPercent = computed(() => (this.servoZ().position / this.tableConfig().RAIL_Z) * 100);
}
