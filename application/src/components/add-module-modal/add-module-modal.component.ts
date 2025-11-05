/**
 * @file src/components/add-module-modal/add-module-modal.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * A modal component for adding new expansion modules.
 */
import { ChangeDetectionStrategy, Component, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModuleService, AvailableModule } from '../../services/module.service';

@Component({
  selector: 'app-add-module-modal',
  imports: [CommonModule],
  templateUrl: './add-module-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddModuleModalComponent {
  private moduleService = inject(ModuleService);
  availableModules = this.moduleService.availableModules;

  close = output<void>();
  moduleInstalled = output<AvailableModule>();

  onClose(): void {
    this.close.emit();
  }

  install(module: AvailableModule): void {
    this.moduleService.installModule(module.fileName);
    this.moduleInstalled.emit(module);
    this.onClose(); // Close modal after installing
  }
}
