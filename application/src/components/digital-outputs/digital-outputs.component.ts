/**
 * @file src/components/digital-outputs/digital-outputs.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for managing and displaying the state of the digital outputs (DO)
 * on the fireCNC board. Allows users to toggle each output.
 */
import { ChangeDetectionStrategy, Component, Signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArduinoService } from '../../services/arduino.service';
import { DashboardSettingsService } from '../../services/dashboard-settings.service';

@Component({
  selector: 'app-digital-outputs',
  templateUrl: './digital-outputs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class DigitalOutputsComponent {
  private arduinoService = inject(ArduinoService);
  // No longer injecting DashboardSettingsService for output config, use ArduinoService directly
  
  private digitalOutputsState: Signal<boolean[]> = this.arduinoService.digitalOutputs;
  private digitalOutputsConfig = this.arduinoService.digitalOutputsConfig; // Use ArduinoService for config

  visibleOutputs = computed(() => {
    const outputsState = this.digitalOutputsState();
    const outputsConfig = this.digitalOutputsConfig();
    
    return outputsConfig
      .filter(config => config.enabled)
      .map(config => ({
        id: config.id,
        name: config.name,
        state: outputsState[config.id]
      }));
  });

  toggleOutput(index: number): void {
    const currentState = this.digitalOutputsState()[index];
    this.arduinoService.setDigitalOutput(index, !currentState);
  }
}