/**
 * @file src/services/module.service.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Manages the discovery and state of hardware expansion modules.
 */
import { Injectable, signal, WritableSignal, inject } from '@angular/core';
import { DashboardSettingsService, DashboardWidget, DashboardLayout } from './dashboard-settings.service';

export interface Port {
  name: string;
  alias?: string;
  // Common
  enabled: boolean;
  portReference?: number;
  // IO Port specific
  type?: 'input' | 'output';
  signal?: 'digital' | 'analog';
  inputType?: 'Default' | 'CT Clamp';
  ctClampCurrent?: number;
  ctClampVoltage?: number;
  // Relay Port specific
  oid?: string;
  onValue?: number;
  offValue?: number;
  // Common for MODBUS
  registerId?: number;
}


export interface Module {
  id: string; // Unique ID for the installed instance
  fileName: string; // The source file name
  moduleName: string;
  author: string;
  version: string;
  function: string;
  protocol: string;
  infoUrl?: string;
  imageUrl?: string;
  description?: string;
  ports: Port[];
  displayOnStatusPage?: boolean;
  displayOnDashboard?: boolean;
}

export interface AvailableModule {
  fileName: string;
  moduleName: string;
  version: string;
}

// Content of data/modules/waveshare-rs485-8ch-relay.json
const relayModuleContent = `{
  "moduleName": "Waveshare RS485 8ch Relay",
  "author": "Mark Dyer",
  "version": "1.0.0",
  "function": "Relay",
  "protocol": "MODBUS RTU",
  "infoUrl": "https://www.waveshare.com/wiki/RS485_Relay_Board",
  "imageUrl": "https://www.waveshare.com/media/catalog/product/cache/1/image/800x800/9df78eab33525d08d6e5fb8d27136e95/r/s/rs485-relay-board-3.jpg",
  "description": "An 8-channel relay module controlled via the RS485 bus, supporting Modbus RTU protocol.",
  "ports": [
    { "name": "Relay 1", "enabled": true, "portReference": 1, "registerId": 1, "onValue": 1, "offValue": 0 },
    { "name": "Relay 2", "enabled": true, "portReference": 2, "registerId": 2, "onValue": 1, "offValue": 0 },
    { "name": "Relay 3", "enabled": true, "portReference": 3, "registerId": 3, "onValue": 1, "offValue": 0 },
    { "name": "Relay 4", "enabled": true, "portReference": 4, "registerId": 4, "onValue": 1, "offValue": 0 },
    { "name": "Relay 5", "enabled": true, "portReference": 5, "registerId": 5, "onValue": 1, "offValue": 0 },
    { "name": "Relay 6", "enabled": true, "portReference": 6, "registerId": 6, "onValue": 1, "offValue": 0 },
    { "name": "Relay 7", "enabled": true, "portReference": 7, "registerId": 7, "onValue": 1, "offValue": 0 },
    { "name": "Relay 8", "enabled": true, "portReference": 8, "registerId": 8, "onValue": 1, "offValue": 0 }
  ]
}`;

// Content of data/modules/waveshare-rs485-analog-input.json
const analogModuleContent = `{
  "moduleName": "Waveshare RS485 Analog Input",
  "author": "Mark Dyer",
  "version": "1.0.0",
  "function": "IO",
  "protocol": "MODBUS RTU",
  "infoUrl": "https://www.waveshare.com/wiki/Analog_Input_Module",
  "imageUrl": "https://www.waveshare.com/media/catalog/product/cache/1/image/800x800/9df78eab33525d08d6e5fb8d27136e95/a/n/analog-input-module-3.jpg",
  "description": "An analog data acquisition module with 4 input channels, controlled via the RS485 bus.",
  "ports": [
    { "name": "Analog In 0", "type": "input", "signal": "analog", "enabled": true, "inputType": "Default" },
    { "name": "Analog In 1", "type": "input", "signal": "analog", "enabled": true, "inputType": "Default" },
    { "name": "Analog In 2", "type": "input", "signal": "analog", "enabled": true, "inputType": "Default" },
    { "name": "Analog In 3", "type": "input", "signal": "analog", "enabled": true, "inputType": "Default" }
  ]
}`;


@Injectable({ providedIn: 'root' })
export class ModuleService {
  private dashboardSettingsService = inject(DashboardSettingsService);
  private moduleFiles: Map<string, WritableSignal<string>> = new Map();
  lastSaveError: WritableSignal<string | null> = signal(null);

  availableModules: WritableSignal<AvailableModule[]> = signal([]);
  installedModules: WritableSignal<Module[]> = signal([]);

  constructor() {
    this.initializeModuleFiles();
    this.loadAvailableModules();
  }

  private initializeModuleFiles(): void {
    this.moduleFiles.set('waveshare-rs485-8ch-relay.json', signal(relayModuleContent));
    this.moduleFiles.set('waveshare-rs485-analog-input.json', signal(analogModuleContent));
  }

  private loadAvailableModules(): void {
    const modules: AvailableModule[] = [];
    for (const [fileName, contentSignal] of this.moduleFiles.entries()) {
      try {
        const parsed = JSON.parse(contentSignal());
        if (parsed.moduleName && parsed.version) {
          modules.push({
            fileName,
            moduleName: parsed.moduleName,
            version: parsed.version
          });
        }
      } catch (e) {
        console.error(`Error parsing module file ${fileName}:`, e);
      }
    }
    this.availableModules.set(modules);
  }

  getModuleFileNames(): string[] {
    return Array.from(this.moduleFiles.keys()).sort();
  }

  getModuleFileContent(fileName: string): WritableSignal<string> | undefined {
    return this.moduleFiles.get(fileName);
  }

  updateModuleFileContent(fileName: string, newContent: string): boolean {
    this.lastSaveError.set(null);
    const contentSignal = this.moduleFiles.get(fileName);
    if (!contentSignal) {
      this.lastSaveError.set(`File not found: ${fileName}`);
      return false;
    }

    try {
      // Validate that the new content is valid JSON before saving
      JSON.parse(newContent);
      contentSignal.set(newContent);
      this.loadAvailableModules(); // Refresh available modules list in case name/version changed
      return true;
    } catch (e: any) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      this.lastSaveError.set(`Invalid JSON: ${errorMessage}`);
      return false;
    }
  }

  addModuleFile(fileName: string, content: string): void {
    if (this.moduleFiles.has(fileName)) {
        console.warn(`Module file ${fileName} already exists. This action is not supported in the simulation.`);
        // In a real app, you might overwrite or return an error. Here we just log.
        return;
    }
    this.moduleFiles.set(fileName, signal(content));
    this.loadAvailableModules(); // Refresh the list
  }

  installModule(fileName: string): void {
    const contentSignal = this.moduleFiles.get(fileName);
    if (!contentSignal) {
      console.error(`Module file not found: ${fileName}`);
      return;
    }

    try {
      const parsed = JSON.parse(contentSignal());
      const newModule: Module = {
        ...parsed,
        id: `${fileName}-${Date.now()}`, // Simple unique ID for this instance
        fileName: fileName,
      };
      this.installedModules.update(current => [...current, newModule]);

      if (newModule.displayOnDashboard) {
        this.addModuleWidget(newModule);
      }
    } catch (e) {
      console.error(`Error installing module from ${fileName}:`, e);
    }
  }

  uninstallModule(moduleId: string): void {
    const moduleToUninstall = this.installedModules().find(m => m.id === moduleId);

    this.installedModules.update(current => current.filter(m => m.id !== moduleId));

    if (moduleToUninstall && moduleToUninstall.displayOnDashboard) {
      this.removeModuleWidget(moduleToUninstall.id);
    }
  }

  getModuleById(moduleId: string): Module | undefined {
    return this.installedModules().find(m => m.id === moduleId);
  }

  updateModulePort(moduleId: string, portIndex: number, newPortData: Port): void {
    const moduleToUpdate = this.getModuleById(moduleId);
    if (!moduleToUpdate) {
      console.error(`Cannot update port: Module with ID ${moduleId} not found.`);
      return;
    }
    
    // 1. Update the in-memory `installedModules` signal for immediate UI feedback
    this.installedModules.update(modules => 
      modules.map(mod => {
        if (mod.id === moduleId) {
          const updatedPorts = [...mod.ports];
          if (portIndex >= 0 && portIndex < updatedPorts.length) {
            updatedPorts[portIndex] = newPortData;
          }
          return { ...mod, ports: updatedPorts };
        }
        return mod;
      })
    );

    // 2. Update the underlying JSON file content
    const contentSignal = this.getModuleFileContent(moduleToUpdate.fileName);
    if (contentSignal) {
      try {
        const fileContent = JSON.parse(contentSignal());
        if (fileContent.ports && portIndex >= 0 && portIndex < fileContent.ports.length) {
          fileContent.ports[portIndex] = newPortData;
          const newJsonString = JSON.stringify(fileContent, null, 2);
          this.updateModuleFileContent(moduleToUpdate.fileName, newJsonString);
        }
      } catch (e) {
        console.error(`Failed to parse and update module file ${moduleToUpdate.fileName}`, e);
        this.lastSaveError.set(`Failed to update module file: ${moduleToUpdate.fileName}`);
      }
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
    
    const currentLayout = this.dashboardSettingsService.layout();
    // Add to the end of column 1
    const newLayout: DashboardLayout = {
      ...currentLayout,
      COLUMN1: [...currentLayout.COLUMN1, newWidget],
    };

    this.dashboardSettingsService.updateLayout(newLayout);
  }

  removeModuleWidget(moduleId: string): void {
    const widgetIdToRemove = `module-${moduleId}`;
    const currentLayout = this.dashboardSettingsService.layout();
    const newLayout: DashboardLayout = {
      COLUMN1: currentLayout.COLUMN1.filter(w => w.ID !== widgetIdToRemove),
      COLUMN2: currentLayout.COLUMN2.filter(w => w.ID !== widgetIdToRemove),
    };
    this.dashboardSettingsService.updateLayout(newLayout);
  }
}
