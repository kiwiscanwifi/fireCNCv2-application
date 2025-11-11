import { ChangeDetectionStrategy, Component, inject, signal, WritableSignal } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MarkdownService } from '../../services/markdown.service';
import { SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-waveshare-rs485-io-analog',
  imports: [CommonModule, NgOptimizedImage, RouterLink],
  templateUrl: './waveshare-modbus-rtu-analog-input-8ch.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaveshareRs485IoAnalogComponent {
  private markdownService = inject(MarkdownService);

  moduleNotes: WritableSignal<string> = signal(`
The **MODBUS-RTU-Analog-Input-8CH** is an industrial-grade 8-channel analog input module. It features an isolated RS485 interface and supports the standard Modbus RTU protocol, making it ideal for acquiring various analog signals in industrial environments. Its robust design ensures reliable data transmission with protection against electrical interference and power surges.

### Key Features
*   **8-channel Analog Input**: Supports common signal types including 0-5V, 0-10V, 0-20mA, and 4-20mA.
*   **Isolated RS485 Interface**: Compliant with standard Modbus RTU protocol, ensuring stable and reliable communication.
*   **Photoelectric Isolation**: Effectively suppresses electrical interference for enhanced communication stability.
*   **Wide Power Supply**: Operates with a DC 7-36V power supply.
*   **Built-in TVS**: Provides Transient Voltage Suppressor for surge protection and anti-lightning capabilities.
*   **Rail-mount Enclosure**: Compact ABS enclosure designed for easy installation in industrial settings.
  `);

  parseMarkdown(content: string): SafeHtml {
    return this.markdownService.parse(content);
  }
}