import { Injectable, signal, WritableSignal, inject, Injector } from '@angular/core';
import { ConfigFileService } from './config-file.service';
import { Module } from './module.service';
import { NotificationService } from './notification.service'; // NEW
import { StateService } from './state.service';
import { ConfigManagementService } from './config-management.service';

export interface DashboardWidget {
  ID: 'digital-outputs' | 'digital-inputs' | 'system-details' | 'storage-info' | 'sram-info' | 'analog-inputs' | 'system-info' | 'light-controller' | 'servo-monitor' | string;
  NAME: string;
  ENABLED: boolean;
  ICON: string;
  TITLE: string;
}

export interface DashboardLayout {
  COLUMN1: DashboardWidget[];
  COLUMN2: DashboardWidget[];
}

export interface DigitalOutputConfig {
  ID: number;
  NAME: string;
  ENABLED: boolean;
}

export interface DigitalInputConfig {
  ID: number;
  NAME: string;
  ENABLED: boolean;
}

export interface AnalogInputConfig {
  ID: number;
  NAME: string;
  ENABLED: boolean;
}

// FIX: Exported the constants so they can be imported by ConfigFileService
export const DEFAULT_LAYOUT: DashboardLayout = {
  COLUMN1: [
    { ID: 'digital-outputs', NAME: 'Digital Outputs', ENABLED: true, ICON: 'fa-toggle-on', TITLE: 'Digital Outputs (8-DO)' },
    { ID: 'digital-inputs', NAME: 'Digital Inputs', ENABLED: true, ICON: 'fa-eye', TITLE: 'Digital Inputs (8-DI)' },
    { ID: 'light-controller', NAME: 'Light Controller', ENABLED: false, ICON: 'fa-lightbulb', TITLE: 'Light Controller' },
  ],
  COLUMN2: [
    { ID: 'system-details', NAME: 'System Details', ENABLED: true, ICON: 'fa-microchip', TITLE: 'System Details' },
    { ID: 'storage-info', NAME: 'Storage Info', ENABLED: true, ICON: 'fa-database', TITLE: 'Storage' },
    { ID: 'sram-info', NAME: 'Memory Info', ENABLED: true, ICON: 'fa-memory', TITLE: 'Memory' },
    { ID: 'analog-inputs', NAME: 'Analog Inputs', ENABLED: false, ICON: 'fa-wave-square', TITLE: 'Waveshare RS485 Analog Input' },
    { ID: 'servo-monitor', NAME: 'Servo Monitor', ENABLED: false, ICON: 'fa-robot', TITLE: 'Servo Monitor' },
    { ID: 'system-info', NAME: 'Application Info', ENABLED: false, ICON: 'fa-circle-info', TITLE: 'Application Info' },
  ],
};

export const DEFAULT_DIGITAL_OUTPUTS: DigitalOutputConfig[] = Array.from({ length: 8 }, (_, i) => ({
  ID: i,
  NAME: `DO ${i}`,
  ENABLED: true,
}));

export const DEFAULT_DIGITAL_INPUTS: DigitalInputConfig[] = Array.from({ length: 8 }, (_, i) => ({
  ID: i,
  NAME: `DI ${i}`,
  ENABLED: true,
}));

export const DEFAULT_ANALOG_INPUTS: AnalogInputConfig[] = Array.from({ length: 4 }, (_, i) => ({
  ID: i,
  NAME: `EXAI${i}`,
  ENABLED: true,
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
  toggleWidget(widgetId: DashboardWidget['ID']) {
    const newLayout = JSON.parse(JSON.stringify(this.layout())); // Deep copy
    let widgetFound = false;
    for (const col of [newLayout.COLUMN1, newLayout.COLUMN2]) {
      const widget = col.find((w: DashboardWidget) => w.ID === widgetId);
      if (widget) {
        widget.ENABLED = !widget.ENABLED;
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
      ID: `module-${module.id}`,
      NAME: module.moduleName,
      ENABLED: true,
      ICON: 'fa-puzzle-piece',
      TITLE: module.moduleName,
    };
    
    const currentLayout = this.layout();
    // Add to the end of column 1
    const newLayout: DashboardLayout = {
      ...currentLayout,
      COLUMN1: [...currentLayout.COLUMN1, newWidget],
    };

    this.updateLayout(newLayout);
  }

  removeModuleWidget(moduleId: string): void {
    const widgetIdToRemove = `module-${moduleId}`;
    const currentLayout = this.layout();
    const newLayout: DashboardLayout = {
      COLUMN1: currentLayout.COLUMN1.filter(w => w.ID !== widgetIdToRemove),
      COLUMN2: currentLayout.COLUMN2.filter(w => w.ID !== widgetIdToRemove),
    };
    this.updateLayout(newLayout);
  }
}
