import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), title: 'Dashboard | fireCNC' },
  
  // Top-level Feature Pages
  { path: 'status', loadComponent: () => import('./pages/snmp-page/snmp-page.component').then(m => m.SnmpPageComponent), title: 'System Status | fireCNC' },
  { path: 'status/details/:type', loadComponent: () => import('./pages/status-details/status-details.component').then(m => m.StatusDetailsComponent), title: 'Status Details | fireCNC' },
  { path: 'leds', loadComponent: () => import('./pages/leds/leds.component').then(m => m.LedsPageComponent), title: 'Visuals | fireCNC' },
  { path: 'mpg', loadComponent: () => import('./pages/mpg/mpg.component').then(m => m.MpgPageComponent), title: 'Pendant | fireCNC' },
  { path: 'linuxcnc-mpg', loadComponent: () => import('./pages/linuxcnc-mpg/linuxcnc-mpg.component').then(m => m.LinuxcncMpgComponent), title: 'LinuxCNC Pendant | fireCNC' },
  { path: 'alexa', loadComponent: () => import('./pages/alexa/alexa.component').then(m => m.AlexaPageComponent), title: 'Alexa | fireCNC' },
  
  // Settings Section
  { path: 'settings', redirectTo: 'settings/landing', pathMatch: 'full' },
  { path: 'settings/landing', loadComponent: () => import('./pages/settings-landing/settings-landing.component').then(m => m.SettingsLandingComponent), title: 'Settings | fireCNC' },
  { path: 'settings/general', loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsPageComponent), title: 'General Settings | fireCNC' },
  { path: 'settings/network', loadComponent: () => import('./pages/network/network.component').then(m => m.NetworkPageComponent), title: 'Network Settings | fireCNC' },
  { path: 'settings/dashboard', loadComponent: () => import('./pages/dashboard-settings/dashboard-settings.component').then(m => m.DashboardSettingsComponent), title: 'Dashboard Settings | fireCNC' },
  { path: 'settings/onboard', loadComponent: () => import('./pages/onboard-settings/onboard-settings.component').then(m => m.OnboardSettingsComponent), title: 'Onboard I/O Settings | fireCNC' },
  { path: 'settings/expansion', loadComponent: () => import('./pages/expansion/expansion.component').then(m => m.ExpansionPageComponent), title: 'Expansion Settings | fireCNC' },
  { path: 'settings/expansion/create', loadComponent: () => import('./pages/create-module/create-module.component').then(m => m.CreateModulePageComponent), title: 'Create Expansion Module | fireCNC' },
  { path: 'settings/expansion/:moduleId/port/:portIndex/edit', loadComponent: () => import('./pages/edit-module-port/edit-module-port.component').then(m => m.EditModulePortComponent), title: 'Edit Module Port | fireCNC' },
  
  // System / Admin Section
  { path: 'system/shell', loadComponent: () => import('./pages/shell/shell.component').then(m => m.ShellComponent), title: 'Shell | fireCNC' },
  { path: 'system/modules', loadComponent: () => import('./pages/modules/modules.component').then(m => m.ModulesPageComponent), title: 'Modules | fireCNC' },
  { path: 'system/advanced', loadComponent: () => import('./pages/advanced/advanced.component').then(m => m.AdvancedPageComponent), title: 'Advanced | fireCNC' },
  { path: 'system/advanced/simulation', loadComponent: () => import('./pages/simulation/simulation.component').then(m => m.SimulationComponent), title: 'Simulation | fireCNC' },
  { path: 'system/advanced/config-editor', loadComponent: () => import('./pages/config-editor/config-editor.component').then(m => m.ConfigEditorComponent), title: 'Edit Config | fireCNC' },
  { path: 'system/advanced/changelog-editor', loadComponent: () => import('./pages/changelog-editor/changelog-editor.component').then(m => m.ChangelogEditorComponent), title: 'Edit Changelog | fireCNC' },
  { path: 'system/advanced/reference-editor', loadComponent: () => import('./pages/reference-editor/reference-editor.component').then(m => m.ReferenceEditorComponent), title: 'Edit Logic Reference | fireCNC' },
  { path: 'system/advanced/backup', loadComponent: () => import('./pages/backup/backup.component').then(m => m.BackupPageComponent), title: 'Backup | fireCNC' },

  // Information Section
  { path: 'information', redirectTo: 'information/landing', pathMatch: 'full' },
  { path: 'information/landing', loadComponent: () => import('./pages/information-landing/information-landing.component').then(m => m.InformationLandingComponent), title: 'Information | fireCNC' },
  { path: 'information/about', loadComponent: () => import('./pages/about/about.component').then(m => m.AboutComponent), title: 'About | fireCNC' },
  { path: 'information/help', loadComponent: () => import('./pages/help/help.component').then(m => m.HelpComponent), title: 'Help | fireCNC' },
  { path: 'information/logic', loadComponent: () => import('./pages/logic/logic.component').then(m => m.LogicComponent), title: 'Logic | fireCNC' },
  { path: 'information/hardware', loadComponent: () => import('./pages/hardware/hardware.component').then(m => m.HardwarePageComponent), title: 'Hardware | fireCNC' },
  { path: 'information/hardware/esp32-s3-poe', loadComponent: () => import('./pages/gpio-page/gpio-page.component').then(m => m.GpioPageComponent), title: 'Waveshare ESP32 | fireCNC' },
  { path: 'information/hardware/rs485-to-ethernet', loadComponent: () => import('./pages/waveshare-rs485-io/waveshare-rs485-io.component').then(m => m.WaveshareRs485ToEthernetComponent), title: 'Waveshare RS485 to Ethernet | fireCNC' },
  { path: 'information/hardware/rs485-hub', loadComponent: () => import('./pages/waveshare-rs485-hub-4p/waveshare-rs485-hub-4p.component').then(m => m.WaveshareRs485HubComponent), title: 'Waveshare RS485 HUB | fireCNC' },
  { path: 'information/hardware/waveshare-rs485-io-analog', loadComponent: () => import('./pages/waveshare-rs485-io-analog/waveshare-rs485-io-analog.component').then(m => m.WaveshareRs485IoAnalogComponent), title: 'Waveshare RS485 IO Analog | fireCNC' },
  { path: 'information/software', loadComponent: () => import('./pages/firmware/firmware.component').then(m => m.FirmwareComponent), title: 'Software | fireCNC' },
  { path: 'information/software/firmware-browser', loadComponent: () => import('./pages/firmware-browser/firmware-browser.component').then(m => m.FirmwareBrowserComponent), title: 'Controller Source | fireCNC' },
  { path: 'information/changelog', loadComponent: () => import('./pages/changelog/changelog.component').then(m => m.ChangelogComponent), title: 'Change Log | fireCNC' },
  { path: 'information/routes', loadComponent: () => import('./pages/routes/routes.component').then(m => m.RoutesComponent), title: 'Routes & Endpoints | fireCNC' },
  { path: 'information/routes/ui', loadComponent: () => import('./pages/ui-routes/ui-routes.component').then(m => m.UiRoutesComponent), title: 'UI Routes | fireCNC' },
  { path: 'information/routes/backend', loadComponent: () => import('./pages/backend-endpoints/backend-endpoints.component').then(m => m.BackendEndpointsComponent), title: 'Backend Endpoints | fireCNC' },
  { path: 'information/routes/filesystem', loadComponent: () => import('./pages/file-system-paths/file-system-paths.component').then(m => m.FileSystemPathsComponent), title: 'File System | fireCNC' },
  { path: 'information/recipe', loadComponent: () => import('./pages/recipe/recipe.component').then(m => m.RecipeComponent), title: 'Recipe | fireCNC' },

  // Activity Section
  { path: 'activity', redirectTo: 'activity/landing', pathMatch: 'full' },
  { path: 'activity/landing', loadComponent: () => import('./pages/activity-landing/activity-landing.component').then(m => m.ActivityLandingComponent), title: 'Activity | fireCNC' },
  { path: 'activity/console', loadComponent: () => import('./pages/console/console.component').then(m => m.ConsoleComponent), title: 'Console | fireCNC' },
  { path: 'activity/system-log', loadComponent: () => import('./pages/system-log/system-log.component').then(m => m.SystemLogComponent), title: 'System Log | fireCNC' },
  { path: 'activity/snmp-traps', loadComponent: () => import('./pages/snmp-traps/snmp-traps.component').then(m => m.SnmpTrapsComponent), title: 'SNMP Log | fireCNC' },
  
  { path: '**', redirectTo: 'dashboard' }
];