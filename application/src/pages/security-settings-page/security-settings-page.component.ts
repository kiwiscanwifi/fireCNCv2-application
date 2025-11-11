import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-security-settings-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './security-settings-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecuritySettingsPageComponent {
  // This component is now a placeholder to guide users, as security settings
  // have been merged into the main SettingsPageComponent.
}
