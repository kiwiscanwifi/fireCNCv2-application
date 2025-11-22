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

interface HardwareCategory {
  title: string;
  icon: string;
  components: {
    name: string;
    description: string;
  }[];
}

@Component({
  selector: 'app-hardware-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './hardware.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HardwarePageComponent {
  hardwareSummary: HardwareCategory[] = [
    {
      title: 'Key Integrated Components',
      icon: 'fa-solid fa-cogs',
      components: [
        {
          name: 'W5500',
          description: 'The chip that provides hard-wired Ethernet connectivity on the main board.'
        },
        {
          name: 'XCA9554',
          description: 'An I/O expander chip that controls the 8 digital outputs (relays).'
        },
        {
          name: 'WS2815',
          description: 'The type of addressable LED strips used for visual feedback on the machine axes.'
        },
        {
          name: 'PCF8523',
          description: 'The Real-Time Clock (RTC) chip used for keeping accurate time.'
        }
      ]
    }
  ];
}
