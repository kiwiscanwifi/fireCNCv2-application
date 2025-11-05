import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { GpioPageComponent } from './pages/gpio-page/gpio-page.component';
import { ConsoleComponent } from './pages/console/console.component';
import { SystemLogComponent } from './pages/system-log/system-log.component';
import { SnmpPageComponent } from './pages/snmp-page/snmp-page.component';
import { SettingsPageComponent } from './pages/settings/settings.component';
import { SnmpTrapsComponent } from './pages/snmp-traps/snmp-traps.component';
import { ConfigEditorComponent } from './pages/config-editor/config-editor.component';
import { ChangelogComponent } from './pages/changelog/changelog.component';
import { ChangelogEditorComponent } from './pages/changelog-editor/changelog-editor.component';
import { ShellComponent } from './pages/shell/shell.component';
import { AboutComponent } from './pages/about/about.component';
import { ReferenceEditorComponent } from './pages/reference-editor/reference-editor.component';
import { FirmwareComponent } from './pages/firmware/firmware.component';
import { LedsPageComponent } from './pages/leds/leds.component';
import { AlexaPageComponent } from './pages/alexa/alexa.component';
import { DependenciesComponent } from './pages/dependencies/dependencies.component';
import { HelpComponent } from './pages/help/help.component';
import { LogicComponent } from './pages/logic/logic.component';
import { FirmwareBrowserComponent } from './pages/firmware-browser/firmware-browser.component';
import { AdvancedPageComponent } from './pages/advanced/advanced.component';
import { DashboardSettingsComponent } from './pages/dashboard-settings/dashboard-settings.component';
import { NetworkPageComponent } from './pages/network/network.component';
import { HardwarePageComponent } from './pages/hardware/hardware.component';
import { WaveshareRs485IoComponent } from './pages/waveshare-rs485-io/waveshare-rs485-io.component';
import { WaveshareRs485Hub4pComponent } from './pages/waveshare-rs485-hub-4p/waveshare-rs485-hub-4p.component';
import { ExpansionPageComponent } from './pages/expansion/expansion.component';
import { CreateModulePageComponent } from './pages/create-module/create-module.component';
import { ModulesPageComponent } from './pages/modules/modules.component';
import { EditModulePortComponent } from './pages/edit-module-port/edit-module-port.component';
import { MpgPageComponent } from './pages/mpg/mpg.component';
import { LinuxcncMpgComponent } from './pages/linuxcnc-mpg/linuxcnc-mpg.component';
import { NpointPageComponent } from './pages/npoint/npoint.component';
import { StatusDetailsComponent } from './pages/status-details/status-details.component';
import { RecipeComponent } from './pages/recipe/recipe.component';
import { OnboardSettingsComponent } from './pages/onboard-settings/onboard-settings.component'; // NEW: Import OnboardSettingsComponent

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent, title: 'Dashboard | fireCNC' },
  { path: 'gpio', component: GpioPageComponent, title: 'Waveshare ESP32 | fireCNC' },
  { path: 'leds', component: LedsPageComponent, title: 'Visuals | fireCNC' },
  { path: 'alexa', component: AlexaPageComponent, title: 'Alexa | fireCNC' },
  { path: 'firmware', component: FirmwareComponent, title: 'Firmware | fireCNC' },
  { path: 'firmware-browser', component: FirmwareBrowserComponent, title: 'Firmware Browser | fireCNC' },
  { path: 'dependencies', component: DependenciesComponent, title: 'Dependencies | fireCNC' },
  { path: 'console', component: ConsoleComponent, title: 'Console | fireCNC' },
  { path: 'shell', component: ShellComponent, title: 'Shell | fireCNC' },
  { path: 'system-log', component: SystemLogComponent, title: 'System Log | fireCNC' },
  { path: 'snmp', component: SnmpPageComponent, title: 'System Status | fireCNC' },
  { path: 'snmp-traps', component: SnmpTrapsComponent, title: 'SNMP Traps | fireCNC' },
  { path: 'about', component: AboutComponent, title: 'About | fireCNC' },
  { path: 'logic', component: LogicComponent, title: 'Logic | fireCNC' },
  { path: 'help', component: HelpComponent, title: 'Help | fireCNC' },
  { path: 'changelog', component: ChangelogComponent, title: 'Change Log | fireCNC' },
  { path: 'modules', component: ModulesPageComponent, title: 'Modules | fireCNC' },
  { path: 'mpg', component: MpgPageComponent, title: 'Pendant | fireCNC' },
  { path: 'linuxcnc-mpg', component: LinuxcncMpgComponent, title: 'LinuxCNC Pendant | fireCNC' },
  { path: 'settings', component: SettingsPageComponent, title: 'Settings | fireCNC' },
  { path: 'network', component: NetworkPageComponent, title: 'Network | fireCNC' },
  { path: 'hardware', component: HardwarePageComponent, title: 'Hardware | fireCNC' },
  { path: 'waveshare-rs485-io', component: WaveshareRs485IoComponent, title: 'Waveshare RS485 IO | fireCNC' },
  { path: 'waveshare-rs485-hub-4p', component: WaveshareRs485Hub4pComponent, title: 'Waveshare RS485 HUB 4P | fireCNC' },
  { path: 'advanced', component: AdvancedPageComponent, title: 'Advanced | fireCNC' },
  { path: 'settings/dashboard', component: DashboardSettingsComponent, title: 'Dashboard Settings | fireCNC' },
  { path: 'settings/onboard', component: OnboardSettingsComponent, title: 'Onboard I/O Settings | fireCNC' }, // NEW: Route for Onboard Settings
  { path: 'settings/expansion', component: ExpansionPageComponent, title: 'Expansion Settings | fireCNC' },
  { path: 'settings/expansion/create', component: CreateModulePageComponent, title: 'Create Expansion Module | fireCNC' },
  { path: 'settings/expansion/:moduleId/port/:portIndex/edit', component: EditModulePortComponent, title: 'Edit Module Port | fireCNC' },
  { path: 'settings/npoint', component: NpointPageComponent, title: 'Cloud Sync | fireCNC' },
  { path: 'settings/config-editor', component: ConfigEditorComponent, title: 'Edit Config | fireCNC' },
  { path: 'settings/changelog-editor', component: ChangelogEditorComponent, title: 'Edit Changelog | fireCNC' },
  { path: 'settings/reference-editor', component: ReferenceEditorComponent, title: 'Edit GPIO Reference | fireCNC' },
  { path: 'status-details/:type', component: StatusDetailsComponent, title: 'Status Details | fireCNC' },
  { path: 'recipe', component: RecipeComponent, title: 'Recipe | fireCNC' }, // New recipe page route
  { path: '**', redirectTo: 'dashboard' } // Wildcard route for any other path
];