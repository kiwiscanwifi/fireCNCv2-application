/**
 * @file src/components/system-info/system-info.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for displaying application and browser information.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { versions } from '../../version';

@Component({
  selector: 'app-system-info',
  imports: [CommonModule, DatePipe],
  templateUrl: './system-info.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemInfoComponent {
  readonly appVersion = versions.APP_VERSION;
  readonly appReleaseDate = versions.APP_RELEASE_DATE;
  readonly userAgent = navigator.userAgent;
  readonly platform = navigator.platform;
}
