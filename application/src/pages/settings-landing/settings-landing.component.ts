import { ChangeDetectionStrategy, Component, inject, Signal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { ArduinoService } from '../../services/arduino.service';
import { ConfirmationModalComponent } from '../../components/confirmation-modal/confirmation-modal.component';

interface SettingsLink {
  path: string;
  icon: string;
  title: string;
  description: string;
  adminOnly: boolean;
}

@Component({
  selector: 'app-settings-landing',
  imports: [CommonModule, RouterLink, ConfirmationModalComponent],
  templateUrl: './settings-landing.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsLandingComponent {
  private adminService = inject(AdminService);
  private arduinoService = inject(ArduinoService);
  
  isAdminMode: Signal<boolean> = this.adminService.isAdminMode;
  showRebootConfirmation = signal(false);

  settingsLinks: SettingsLink[] = [
    { path: '/settings/general', icon: 'fa-solid fa-sliders', title: 'General', description: 'Core system, watchdog, security, and LED settings.', adminOnly: false },
    { path: '/settings/network', icon: 'fa-solid fa-ethernet', title: 'Network', description: 'Manage Ethernet, Wi-Fi, and SNMP configurations.', adminOnly: false },
    { path: '/settings/dashboard', icon: 'fa-solid fa-table-columns', title: 'Dashboard', description: 'Customize the layout and visibility of dashboard widgets.', adminOnly: false },
    { path: '/settings/onboard', icon: 'fa-solid fa-microchip', title: 'Onboard I/O', description: 'Configure names and visibility for onboard inputs and outputs.', adminOnly: false },
    { path: '/settings/expansion', icon: 'fa-solid fa-puzzle-piece', title: 'Expansion', description: 'Add, create, and manage external hardware modules.', adminOnly: false },
    { path: '/system/advanced/backup', icon: 'fa-solid fa-folder-open', title: 'Backup', description: 'View and manage configuration file backups.', adminOnly: true },
    { path: '/system/advanced', icon: 'fa-solid fa-file-code', title: 'Advanced', description: 'Access raw file editors and simulation tools.', adminOnly: true },
  ];

  promptReboot(): void {
    this.showRebootConfirmation.set(true);
  }

  handleRebootConfirm(): void {
    this.arduinoService.rebootDevice();
    this.showRebootConfirmation.set(false);
  }

  handleRebootCancel(): void {
    this.showRebootConfirmation.set(false);
  }
}
