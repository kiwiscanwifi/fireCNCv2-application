/**
 * @file src/pages/logic/logic.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for the Logic page, which explains the application's internal workings.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logic',
  imports: [CommonModule],
  templateUrl: './logic.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogicComponent {}