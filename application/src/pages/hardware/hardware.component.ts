/**
 * @file src/pages/hardware/hardware.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for the Hardware Hub page, which links to different hardware modules.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-hardware-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './hardware.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HardwarePageComponent {}