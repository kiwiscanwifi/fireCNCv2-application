import { ChangeDetectionStrategy, Component, inject, signal, WritableSignal } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MarkdownService } from '../../services/markdown.service';
import { SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-sp902e-repeater',
  imports: [CommonModule, NgOptimizedImage, RouterLink],
  templateUrl: './sp902e-repeater.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sp902eRepeaterComponent {
  private markdownService = inject(MarkdownService);

  moduleNotes: WritableSignal<string> = signal(`
The **SP902E** is a versatile SPI signal amplifier and repeater designed for addressable LED strips. It takes a single SPI signal input and outputs it on two channels, allowing for longer cable runs and larger LED installations without signal degradation.

### Key Features
*   **Dual Channel Output**: Amplifies and splits one SPI input signal into two separate outputs.
*   **Wide Voltage Compatibility**: Supports a wide input voltage range of DC 5V to 24V.
*   **Broad LED Support**: Compatible with a wide variety of SPI-based addressable LED strips, including WS2811, WS2812B, WS2813, WS2815, SK6812, and APA102.
*   **Signal Integrity**: Regenerates and boosts the signal, preventing issues like flickering, color shifting, or data loss over long distances.
*   **Cascadable**: Multiple SP902E repeaters can be chained together to extend the signal range even further.
*   **Compact Design**: Its small form factor makes it easy to integrate into various projects and enclosures.
  `);

  parseMarkdown(content: string): SafeHtml {
    return this.markdownService.parse(content);
  }
}
