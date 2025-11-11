import { ChangeDetectionStrategy, Component, Signal, inject, signal, WritableSignal } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GpioInfoComponent } from '../../components/gpio-info/gpio-info.component';
import { SafeHtml } from '@angular/platform-browser';
import { MarkdownService } from '../../services/markdown.service';

@Component({
  selector: 'app-gpio-page',
  imports: [CommonModule, GpioInfoComponent, NgOptimizedImage, RouterLink],
  templateUrl: './gpio-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GpioPageComponent {
  private markdownService = inject(MarkdownService);
  
  // NEW: Dedicated signal for board-specific notes
  boardNotes: WritableSignal<string> = signal(`
The **Waveshare ESP32-S3-POE-ETH-8DI-8DO** is a high-performance industrial control board built around the ESP32-S3-WROOM-1 module. It integrates a comprehensive set of features for robust IoT and automation applications.

### Key Features
*   **ESP32-S3-WROOM-1 Module**: Equipped with the powerful ESP32-S3-WROOM-1 module, offering Wi-Fi and Bluetooth LE connectivity.
*   **Ethernet with PoE**: Features an Ethernet port that supports Power over Ethernet (PoE) for simplified cabling and reliable network connectivity.
*   **8-ch Isolated Digital Inputs**: Provides 8 channels of isolated digital inputs, ensuring robust signal acquisition in noisy industrial environments.
*   **8-ch Isolated Digital Outputs**: Includes 8 channels of isolated digital outputs, suitable for controlling various industrial loads and actuators.
*   **CAN & RS485 Interfaces**: Onboard CAN (Controller Area Network) and RS485 interfaces for industrial fieldbus communication.
*   **Wide Voltage Power Supply**: Supports a broad power supply range of 7~35V DC, suitable for diverse industrial power systems.
*   **Rail-mount Enclosure**: Designed with a standard industrial rail-mount enclosure for easy installation and integration into control cabinets.
  `);

  parseMarkdown(content: string): SafeHtml {
    return this.markdownService.parse(content);
  }
}
