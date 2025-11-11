import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-routes-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './routes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoutesComponent {
  // No logic needed, this is now just a landing page.
}
