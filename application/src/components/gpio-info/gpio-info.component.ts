/**
 * @file src/components/gpio-info/gpio-info.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component that displays a static reference guide for the GPIO pinout of the
 * fireCNC hardware, categorized by function.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface GpioMapping {
  category: string;
  icon: string;
  pins: { name: string; gpio: string; description?: string }[];
}

@Component({
  selector: 'app-gpio-info',
  templateUrl: './gpio-info.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class GpioInfoComponent {
  pinout: GpioMapping[] = [
    {
      category: 'Ethernet (W5500)',
      icon: 'fa-solid fa-network-wired',
      pins: [
        { name: 'ETH_INT', gpio: '12' },
        { name: 'ETH_MOSI', gpio: '13' },
        { name: 'ETH_MISO', gpio: '14' },
        { name: 'ETH_SCLK', gpio: '15' },
        { name: 'ETH_CS', gpio: '16' },
        { name: 'ETH_RST', gpio: '39' },
      ],
    },
    {
      category: 'Communication',
      icon: 'fa-solid fa-satellite-dish',
      pins: [
        { name: 'CAN TX', gpio: '2' },
        { name: 'RS485 TX', gpio: '17' },
        { name: 'RS485 RX', gpio: '18' },
        { name: 'RS485 RTS', gpio: '21' },
      ]
    },
    {
      category: 'Storage & Time',
      icon: 'fa-solid fa-memory',
      pins: [
          { name: 'SD_D0', gpio: '45', description: 'TF Card' },
          { name: 'SD_CMD', gpio: '47', description: 'TF Card' },
          { name: 'SD_SCK', gpio: '48', description: 'TF Card' },
          { name: 'RTC_INT', gpio: '40' },
          { name: 'RTC_SCL', gpio: '41' },
          { name: 'RTC_SDA', gpio: '42' },
      ]
    },
    {
      category: 'Onboard Peripherals',
      icon: 'fa-solid fa-microchip',
      pins: [
          { name: 'BOOT Button', gpio: '0' },
          { name: 'Onboard LED', gpio: '38' },
          { name: 'Buzzer', gpio: '46' },
      ]
    },
    {
      category: 'Analog Inputs',
      icon: 'fa-solid fa-wave-square',
      pins: [
        { name: 'ADC Voltage Monitor', gpio: '3' }
      ]
    },
  ];
}