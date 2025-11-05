import { ChangeDetectionStrategy, Component, inject, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardSettingsService, DashboardLayout, DashboardWidget } from '../../services/dashboard-settings.service';
import { ConfigFileService } from '../../services/config-file.service'; // NEW: Import ConfigFileService
import { ArduinoService } from '../../services/arduino.service'; // NEW: Import ArduinoService

@Component({
  selector: 'app-dashboard-settings',
  imports: [CommonModule],
  templateUrl: './dashboard-settings.component.html',
  styles: [`
    .drop-zone {
      min-height: 100px;
      border: 2px dashed #4b5563; /* border-gray-600 */
      transition: all 0.2s;
    }
    .drag-over {
      border-color: #f97316; /* border-orange-500 */
      background-color: rgba(249, 115, 22, 0.1);
    }
    .widget-item.dragging {
      opacity: 0.4;
      background-color: #374151; /* bg-gray-700 */
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardSettingsComponent {
  dashboardSettingsService = inject(DashboardSettingsService);
  private configFileService = inject(ConfigFileService); // NEW: Inject ConfigFileService
  private arduinoService = inject(ArduinoService); // NEW: Inject ArduinoService

  layout = this.dashboardSettingsService.layout;
  
  // digitalOutputsConfig and digitalInputsConfig signals are now managed by OnboardSettingsComponent
  analogInputsConfig = this.dashboardSettingsService.analogInputsConfig; // REMAINs, as it is still here

  // State for managing drag operations
  draggedWidget: WritableSignal<DashboardWidget | null> = signal(null);
  dragOverColumn: WritableSignal<'column1' | 'column2' | null> = signal(null);

  // --- Widget Actions ---

  toggleWidget(widgetId: DashboardWidget['id']) {
    this.dashboardSettingsService.toggleWidget(widgetId);
  }

  resetLayout(): void {
    this.dashboardSettingsService.resetToDefault();
  }

  // --- Analog Input Actions ---
  updateAnalogInputName(id: number, event: Event) {
    const newName = (event.target as HTMLInputElement).value;
    const newConfig = this.analogInputsConfig().map(o => o.id === id ? { ...o, name: newName } : o);
    this.dashboardSettingsService.updateAnalogInputsConfig(newConfig);
  }

  toggleAnalogInputEnabled(id: number) {
    const newConfig = this.analogInputsConfig().map(o => o.id === id ? { ...o, enabled: !o.enabled } : o);
    this.dashboardSettingsService.updateAnalogInputsConfig(newConfig);
  }

  // --- Drag and Drop Handlers ---

  onDragStart(event: DragEvent, widget: DashboardWidget) {
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
    event.preventDefault(); // This is crucial for the drop event to fire
  }

  onDragEnter(column: 'column1' | 'column2') {
    if (this.draggedWidget()) {
      this.dragOverColumn.set(column);
    }
  }

  onDragLeave(event: DragEvent) {
    // Check if the mouse is leaving the drop zone element itself, not just its children
    const dropZone = event.currentTarget as HTMLElement;
    if (!dropZone.contains(event.relatedTarget as Node)) {
        this.dragOverColumn.set(null);
    }
  }

  onDrop(event: DragEvent, targetColumnName: 'column1' | 'column2') {
    event.preventDefault();
    const widgetToMove = this.draggedWidget();
    if (!widgetToMove) {
      return;
    }

    const newLayout = JSON.parse(JSON.stringify(this.layout())) as DashboardLayout;

    // Remove widget from its original position in either column
    newLayout.column1 = newLayout.column1.filter(w => w.id !== widgetToMove.id);
    newLayout.column2 = newLayout.column2.filter(w => w.id !== widgetToMove.id);

    // Find where to insert it
    const targetList = newLayout[targetColumnName];
    const dropTargetEl = (event.target as HTMLElement).closest('[data-widget-id]');
    
    if (dropTargetEl) {
        const dropTargetId = dropTargetEl.getAttribute('data-widget-id');
        const dropIndex = targetList.findIndex(w => w.id === dropTargetId);
        if (dropIndex !== -1) {
            // Insert before the element we dropped on
            targetList.splice(dropIndex, 0, widgetToMove);
        } else {
            // Dropped on an element, but it's not in the target list (e.g., dragging from col1 to col2)
            // In this case, just append
            targetList.push(widgetToMove);
        }
    } else {
        // Dropped in an empty space, append to the end
        targetList.push(widgetToMove);
    }
    
    this.dashboardSettingsService.updateLayout(newLayout);
    this.onDragEnd();
  }
}