import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mpg-page',
  imports: [CommonModule],
  templateUrl: './mpg.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MpgPageComponent {}
