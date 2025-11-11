import { Injectable, signal, WritableSignal, inject, Injector } from '@angular/core';
import { ConfigFileService } from './config-file.service';
import { Module } from './module.service';
import { NotificationService } from './notification.service'; // NEW
import { StateService } from './state.service';
import { ConfigManagementService } from './config-management.service';

export interface DashboardWidget {
  id: 'digital-outputs' | 'digital-inputs' | 'system-details' | 'storage-info' | 'sram-info' | 'analog-inputs' | string;
  name: string;
  enabled: boolean;
  icon: string;
  title: string;
}

export interface DashboardLayout {
  column1: DashboardWidget[];
  column2: DashboardWidget[];
}

export interface DigitalOutputConfig {
  id: number;
  name: string;
  enabled: boolean;
}

export interface DigitalInputConfig {
  id: number;
  name: string;
  enabled: boolean;
}

export interface AnalogInputConfig {
  id: number;
  name: string;
  enabled: boolean;
}

// FIX: Exported the constants so they can be imported by ConfigFileService
export const DEFAULT_LAYOUT: DashboardLayout = {
  column1: [
    { id: 'digital-outputs', name: 'Digital Outputs', enabled: true, icon: 'fa-toggle-on', title: 'Digital Outputs (8-DO)' },
    { id: 'digital-inputs', name: 'Digital Inputs', enabled: true, icon: 'fa-eye', title: 'Digital Inputs (8-DI)' },
  ],
  column2: [
    { id: 'system-details', name: 'System Details', enabled: true, icon: 'fa-microchip', title: 'System Details' },
    { id: 'storage-info', name: 'Storage Info', enabled: true, icon: 'fa-database', title: 'Storage' },
    { id: 'sram-info', name: 'Memory Info', enabled: true, icon: 'fa-memory', title: 'Memory' },
    { id: 'analog-inputs', name: 'Analog Inputs', enabled: false, icon: 'fa-wave-square', title: 'Waveshare RS485 Analog Input' },
  ],
};

export const DEFAULT_DIGITAL_OUTPUTS: DigitalOutputConfig[] = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  name: `DO ${i}`,
  enabled: true,
}));

export const DEFAULT_DIGITAL_INPUTS: DigitalInputConfig[] = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  name: `DI ${i}`,
  enabled: true,
}));

export const DEFAULT_ANALOG_INPUTS: AnalogInputConfig[] = Array.from({ length: 4 }, (_, i) => ({
  id: i,
  name: `EXAI${i}`,
  enabled: true,
}));


@Injectable({
  providedIn: 'root',
})
export class DashboardSettingsService {
  private notificationService = inject(NotificationService);
  private stateService = inject(StateService);
  private injector = inject(Injector);

  private _configManagementService!: ConfigManagementService;
  private get configManagementService(): ConfigManagementService {
    if (!this._configManagementService) {
      this._configManagementService = this.injector.get(ConfigManagementService);
    }
    return this._configManagementService;
  }

  // State is now read from StateService
  layout = this.stateService.layout;
  analogInputsConfig = this.stateService.analogInputsConfig;

  constructor() {
    // The constructor is now empty. The initial state is set by `setConfig`
    // when `ConfigFileService` loads the main configuration.
  }

  /**
   * Returns the default dashboard layout.
   */
  public getDefaultLayout(): DashboardLayout {
    return DEFAULT_LAYOUT;
  }

  /**
   * Returns the default digital outputs configuration.
   */
  public getDefaultDigitalOutputs(): DigitalOutputConfig[] {
    return DEFAULT_DIGITAL_OUTPUTS;
  }

  /**
   * Returns the default digital inputs configuration.
   */
  public getDefaultDigitalInputs(): DigitalInputConfig[] {
    return DEFAULT_DIGITAL_INPUTS;
  }

  /**
   * Returns the default analog inputs configuration.
   */
  public getDefaultAnalogInputs(): AnalogInputConfig[] {
    return DEFAULT_ANALOG_INPUTS;
  }

  /**
   * Sets the dashboard layout from the main configuration file.
   * Called by ConfigFileService on load and save.
   * @param layout The layout object from config.json.
   * @param analogInputs The analog inputs config from config.json.
   */
  setConfig(layout: DashboardLayout | undefined, analogInputs: AnalogInputConfig[] | undefined) {
    this.layout.set(layout || this.getDefaultLayout());
    this.analogInputsConfig.set(analogInputs || this.getDefaultAnalogInputs());
  }

  /**
   * Stages an update to the dashboard layout.
   * @param newLayout The new layout to be saved to config.json.
   */
  updateLayout(newLayout: DashboardLayout): void {
    this.layout.set(newLayout);
    this.configManagementService.updateDashboardLayout(newLayout);
    // The component is responsible for calling commitChanges()
  }

  /**
   * Initiates an update to the analog inputs configuration.
   * @param newConfig The new config to be saved.
   */
  updateAnalogInputsConfig(newConfig: AnalogInputConfig[]) {
    this.analogInputsConfig.set(newConfig);
    // This is a slice of a different config section, so we don't save it here.
    // The DashboardSettingsComponent will handle saving via ConfigManagementService.
    console.warn('Staged Analog Input config change. Awaiting commit.');
  }

  /**
   * Resets the dashboard layout to the default configuration.
   */
  resetToDefault() {
    // Create a deep copy to prevent any potential mutation of the constant
    const defaultLayoutCopy = JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
    this.updateLayout(defaultLayoutCopy);
  }

  /**
   * Toggles the enabled state of a widget and stages a save.
   * @param widgetId The ID of the widget to toggle.
   */
  toggleWidget(widgetId: DashboardWidget['id']) {
    const newLayout = JSON.parse(JSON.stringify(this.layout())); // Deep copy
    let widgetFound = false;
    for (const col of [newLayout.column1, newLayout.column2]) {
      const widget = col.find((w: DashboardWidget) => w.id === widgetId);
      if (widget) {
        widget.enabled = !widget.enabled;
        widgetFound = true;
        break;
      }
    }
    if (widgetFound) {
      this.updateLayout(newLayout);
    }
  }

  addModuleWidget(module: Module): void {
    const newWidget: DashboardWidget = {
      id: `module-${module.id}`,
      name: module.moduleName,
      enabled: true,
      icon: 'fa-puzzle-piece',
      title: module.moduleName,
    };
    
    const currentLayout = this.layout();
    // Add to the end of column 1
    const newLayout: DashboardLayout = {
      ...currentLayout,
      column1: [...currentLayout.column1, newWidget],
    };

    this.updateLayout(newLayout);
  }

  removeModuleWidget(moduleId: string): void {
    const widgetIdToRemove = `module-${moduleId}`;
    const currentLayout = this.layout();
    const newLayout: DashboardLayout = {
      column1: currentLayout.column1.filter(w => w.id !== widgetIdToRemove),
      column2: currentLayout.column2.filter(w => w.id !== widgetIdToRemove),
    };
    this.updateLayout(newLayout);
  }
}