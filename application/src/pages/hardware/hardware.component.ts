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
      title: 'Main Controller Board',
      icon: 'fa-solid fa-microchip',
      components: [
        {
          name: 'Waveshare ESP32-S3-POE-ETH-8DI-8DO',
          description: 'The central processing unit and main board, featuring integrated PoE, Ethernet, 8 digital inputs, and 8 digital outputs.'
        }
      ]
    },
    {
      title: 'Expansion Modules & Peripherals',
      icon: 'fa-solid fa-puzzle-piece',
      components: [
        {
          name: 'Waveshare RS485 to Ethernet',
          description: 'An industrial adapter that bridges the RS485 serial bus to an Ethernet network.'
        },
        {
          name: 'Waveshare RS485 HUB',
          description: 'A 4-channel hub that acts as a signal repeater and distributor for the RS485 network.'
        },
        {
          name: 'Waveshare RS485 IO Analog',
          description: 'An 8-channel analog input module for reading sensors via Modbus RTU protocol.'
        },
        {
          name: 'Waveshare RS485 8ch Relay',
          description: 'An 8-channel relay module controlled over the RS485 bus.'
        }
      ]
    },
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