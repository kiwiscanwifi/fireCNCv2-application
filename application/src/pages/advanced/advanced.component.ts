/**
 * @file src/pages/advanced/advanced.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for the Advanced page, which provides access to raw file editors.
 */
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-advanced-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './advanced.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdvancedPageComponent {
  isAdvancedOpen = signal(true);

  toggleAdvanced(): void {
    this.isAdvancedOpen.update(value => !value);
  }
}
