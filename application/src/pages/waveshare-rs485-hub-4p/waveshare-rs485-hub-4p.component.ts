/**
 * @file src/pages/waveshare-rs485-hub-4p/waveshare-rs485-hub-4p.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for the Waveshare RS485-HUB-4P page.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-waveshare-rs485-hub',
  imports: [CommonModule, NgOptimizedImage, RouterLink],
  templateUrl: './waveshare-rs485-hub-4p.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaveshareRs485HubComponent {}