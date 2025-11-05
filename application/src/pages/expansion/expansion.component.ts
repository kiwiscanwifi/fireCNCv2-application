import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AddModuleModalComponent } from '../../components/add-module-modal/add-module-modal.component';
import { ModuleService, Module } from '../../services/module.service';
import { RouterLink } from '@angular/router';
import { ConfirmationModalComponent } from '../../components/confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-expansion-page',
  imports: [CommonModule, AddModuleModalComponent, ConfirmationModalComponent, RouterLink],
  templateUrl: './expansion.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpansionPageComponent {
  private moduleService = inject(ModuleService);
  installedModules = this.moduleService.installedModules;
  showAddModuleModal = signal(false);

  // State for delete confirmation
  showDeleteConfirmation = signal(false);
  moduleToDelete = signal<Module | null>(null);

  deleteMessage = computed(() => {
    const module = this.moduleToDelete();
    return module
      ? `Are you sure you want to uninstall the module "${module.moduleName}"? This action cannot be undone.`
      : '';
  });

  openAddModuleModal(): void {
    this.showAddModuleModal.set(true);
  }

  closeAddModuleModal(): void {
    this.showAddModuleModal.set(false);
  }

  promptUninstallModule(module: Module): void {
    this.moduleToDelete.set(module);
    this.showDeleteConfirmation.set(true);
  }

  handleUninstallConfirm(): void {
    const module = this.moduleToDelete();
    if (module) {
      this.moduleService.uninstallModule(module.id);
    }
    this.handleUninstallCancel();
  }

  handleUninstallCancel(): void {
    this.moduleToDelete.set(null);
    this.showDeleteConfirmation.set(false);
  }

  getSignalIcon(signalType: 'digital' | 'analog'): string {
    return signalType === 'digital' ? 'fa-solid fa-microchip' : 'fa-solid fa-wave-square';
  }

  getTypeIcon(portType: 'input' | 'output'): string {
    return portType === 'input' ? 'fa-solid fa-arrow-right-to-bracket' : 'fa-solid fa-arrow-right-from-bracket';
  }
}
