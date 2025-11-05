import { ChangeDetectionStrategy, Component, computed, inject, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DigitalOutputsComponent } from '../../components/digital-outputs/digital-outputs.component';
import { DigitalInputsComponent } from '../../components/digital-inputs/digital-inputs.component';
import { SystemDetailsComponent } from '../../components/system-details/system-details.component';
import { StorageInfoComponent } from '../../components/storage-info/storage-info.component';
import { SramInfoComponent } from '../../components/sram-info/sram-info.component';
import { DashboardSettingsService, DashboardLayout, DashboardWidget } from '../../services/dashboard-settings.service';
import { AnalogInputsComponent } from '../../components/analog-inputs/analog-inputs.component';
import { ModuleWidgetComponent } from '../../components/module-widget/module-widget.component';
import { AdminService } from '../../services/admin.service'; // Import AdminService

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    DigitalOutputsComponent,
    DigitalInputsComponent,
    SystemDetailsComponent,
    StorageInfoComponent,
    SramInfoComponent,
    AnalogInputsComponent,
    ModuleWidgetComponent,
  ],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .drop-zone.drag-over {
      /* Adding a visual cue to the drop zone */
      background-color: rgba(249, 115, 22, 0.05);
      border: 2px dashed #4b5563;
    }
    .widget-item.dragging {
      opacity: 0.4;
      transform: scale(0.98);
    }
    .widget-item {
      transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
    }
    .drop-zone {
      min-height: 100px;
      border: 2px dashed transparent; /* Reserve space for border */
      transition: all 0.2s;
    }
  `],
})
export class DashboardComponent {
  private dashboardSettingsService = inject(DashboardSettingsService);
  protected adminService = inject(AdminService); // Inject AdminService
  private layout = this.dashboardSettingsService.layout;

  column1Widgets = computed(() => this.layout().column1.filter(w => w.enabled));
  column2Widgets = computed(() => this.layout().column2.filter(w => w.enabled));

  isDashboardEmpty = computed(() => this.column1Widgets().length === 0 && this.column2Widgets().length === 0);
  isAdminMode = this.adminService.isAdminMode; // Expose isAdminMode

  // --- Drag and Drop State ---
  draggedWidget: WritableSignal<DashboardWidget | null> = signal(null);
  dragOverColumn: WritableSignal<'column1' | 'column2' | null> = signal(null);

  isModuleWidget(widgetId: string): boolean {
    return widgetId.startsWith('module-');
  }

  getModuleId(widgetId: string): string {
    return widgetId.substring(7);
  }

  onDragStart(event: DragEvent, widget: DashboardWidget) {
    // Only allow drag if in admin mode
    if (!this.isAdminMode()) {
      event.preventDefault();
      return;
    }
    this.draggedWidget.set(widget);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', widget.id);
    }
  }

  onDragEnd() {
    this.draggedWidget.set(null);
    this.dragOverColumn.set(null);
  }

  onDragOver(event: DragEvent) {
    // Only allow drag over if in admin mode
    if (!this.isAdminMode()) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
  }

  onDragEnter(column: 'column1' | 'column2') {
    // Only allow drag enter if in admin mode
    if (!this.isAdminMode()) {
      return;
    }
    if (this.draggedWidget()) {
      this.dragOverColumn.set(column);
    }
  }

  onDragLeave(event: DragEvent) {
    // Only allow drag leave if in admin mode
    if (!this.isAdminMode()) {
      return;
    }
    const dropZone = event.currentTarget as HTMLElement;
    if (!dropZone.contains(event.relatedTarget as Node)) {
        this.dragOverColumn.set(null);
    }
  }

  onDrop(event: DragEvent, targetColumnName: 'column1' | 'column2') {
    // Only allow drop if in admin mode
    if (!this.isAdminMode()) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    const widgetToMove = this.draggedWidget();
    if (!widgetToMove) {
      return;
    }

    const newLayout = JSON.parse(JSON.stringify(this.layout())) as DashboardLayout;

    newLayout.column1 = newLayout.column1.filter(w => w.id !== widgetToMove.id);
    newLayout.column2 = newLayout.column2.filter(w => w.id !== widgetToMove.id);

    const targetList = newLayout[targetColumnName];
    const dropTargetEl = (event.target as HTMLElement).closest('[data-widget-id]');
    
    if (dropTargetEl) {
        const dropTargetId = dropTargetEl.getAttribute('data-widget-id');
        const dropIndex = targetList.findIndex(w => w.id === dropTargetId);
        if (dropIndex !== -1) {
            targetList.splice(dropIndex, 0, widgetToMove);
        } else {
            targetList.push(widgetToMove);
        }
    } else {
        targetList.push(widgetToMove);
    }
    
    this.dashboardSettingsService.updateLayout(newLayout);
    this.onDragEnd();
  }
}