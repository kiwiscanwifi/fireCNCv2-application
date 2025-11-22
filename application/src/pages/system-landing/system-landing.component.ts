import { ChangeDetectionStrategy, Component, inject, Signal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { ArduinoService } from '../../services/arduino.service';
import { ConfirmationModalComponent } from '../../components/confirmation-modal/confirmation-modal.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

interface SystemLink {
  path: string;
  icon: string;
  title: string;
  description: string;
  adminOnly: boolean;
}

@Component({
  selector: 'app-system-landing',
  imports: [CommonModule, RouterLink, ConfirmationModalComponent, TranslatePipe],
  templateUrl: './system-landing.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemLandingComponent {
  private adminService = inject(AdminService);
  private arduinoService = inject(ArduinoService);
  
  isAdminMode: Signal<boolean> = this.adminService.isAdminMode;
  showRebootConfirmation = signal(false);

  systemLinks: SystemLink[] = [
    { path: '/system/shell', icon: 'fa-solid fa-terminal', title: 'Shell', description: 'Access the command-line interface.', adminOnly: true },
    { path: '/system/modules', icon: 'fa-solid fa-puzzle-piece', title: 'Modules', description: 'Edit the raw JSON definitions for expansion modules.', adminOnly: true },
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
