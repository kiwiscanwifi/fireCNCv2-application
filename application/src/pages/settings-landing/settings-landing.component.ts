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
  private adminService = inject(