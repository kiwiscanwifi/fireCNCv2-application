import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModuleService } from '../../services/module.service';

@Component({
  selector: 'app-module-widget',
  imports: [CommonModule],
  templateUrl: './module-widget.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModuleWidgetComponent {
  private moduleService = inject(ModuleService);
  moduleId = input.required<string>();
  
  module = computed(() => this.moduleService.getModuleById(this.moduleId()));

  enabledPorts = computed(() => {
    return this.module()?.ports.filter(p => p.enabled) ?? [];
  });

  // State for MPG Widget
  selectedAxis = signal<'X' | 'Y' | 'Z'>('X');
  selectedStep = signal<number>(0.1);
  steps = [0.001, 0.01, 0.1, 1, 10];

  selectAxis(axis: 'X' | 'Y' | 'Z') {
    this.selectedAxis.set(axis);
  }

  selectStep(step: number) {
      this.selectedStep.set(step);
  }

  jog(direction: 1 | -1) {
      console.log(`JOG: Axis ${this.selectedAxis()}, Step ${this.selectedStep()}, Direction ${direction > 0 ? '+' : '-'}`);
      // In a real app, this would send a command to the backend
  }

  // Re-using logic from expansion page
  getSignalIcon(signalType: 'digital' | 'analog' | undefined): string {
    if (!signalType) return '';
    return signalType === 'digital' ? 'fa-solid fa-microchip' : 'fa-solid fa-wave-square';
  }

  getTypeIcon(portType: 'input' | 'output' | undefined): string {
    if (!portType) return '';
    return portType === 'input' ? 'fa-solid fa-arrow-right-to-bracket' : 'fa-solid fa-arrow-right-from-bracket';
  }
}