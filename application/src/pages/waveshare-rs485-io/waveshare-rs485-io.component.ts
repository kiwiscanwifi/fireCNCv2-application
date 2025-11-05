/**
 * @file src/pages/waveshare-rs485-io/waveshare-rs485-io.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for the Waveshare RS485 IO page.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-waveshare-rs485-io',
  imports: [CommonModule, NgOptimizedImage, RouterLink],
  templateUrl: './waveshare-rs485-io.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaveshareRs485IoComponent {}