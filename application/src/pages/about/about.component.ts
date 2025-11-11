import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { versions } from '../../version';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-about',
  imports: [CommonModule, RouterLink, NgOptimizedImage],
  templateUrl: './about.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent {
  readonly appVersion = versions.APP_VERSION;

  projectInfo = [
    { label: 'Project', value: 'fireCNC Control Panel', icon: 'fa-solid fa-fire' },
    { label: 'Version', value: this.appVersion, icon: 'fa-solid fa-tag' },
    { label: 'Author', value: 'Mark Dyer', icon: 'fa-solid fa-user' },
    { label: 'Location', value: 'Blenheim, New Zealand', icon: 'fa-solid fa-map-marker-alt' }
  ];
}
