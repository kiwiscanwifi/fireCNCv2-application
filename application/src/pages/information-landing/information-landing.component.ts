import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../services/admin.service';

interface InformationLink {
  path: string;
  icon: string;
  title: string;
  description: string;
  adminOnly: boolean;
}

@Component({
  selector: 'app-information-landing',
  imports: [CommonModule, RouterLink],
  templateUrl: './information-landing.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformationLandingComponent {
  private adminService = inject(AdminService);
  isAdminMode: Signal<boolean> = this.adminService.isAdminMode;

  informationLinks: InformationLink[] = [
    { path: '/about', icon: 'fa-solid fa-circle-info', title: 'About', description: 'Learn about the fireCNC application.', adminOnly: false },
    { path: '/help', icon: 'fa-solid fa-book-open', title: 'Help', description: 'Get help and guidance on using the app.', adminOnly: false },
    { path: '/logic', icon: 'fa-solid fa-atom', title: 'Logic', description: 'Understand the application\'s internal workings.', adminOnly: false },
    { path: '/hardware', icon: 'fa-solid fa-cubes', title: 'Hardware', description: 'View details of system hardware modules.', adminOnly: false },
    { path: '/firmware', icon: 'fa-solid fa-save', title: 'Software', description: 'View controller and application software versions.', adminOnly: false },
    { path: '/routes', icon: 'fa-solid fa-route', title: 'Routes & Endpoints', description: 'Explore UI routes, API endpoints, and the file system.', adminOnly: false },
    { path: '/recipe', icon: 'fa-solid fa-receipt', title: 'Recipe', description: 'View the application rebuild prompt.', adminOnly: true },
  ];
}
