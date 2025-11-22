import { ChangeDetectionStrategy, Component, inject, signal, WritableSignal } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MarkdownService } from '../../services/markdown.service';
import { SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-power-supply-idealplusing',
  imports: [CommonModule, NgOptimizedImage, RouterLink],
  templateUrl: './power-supply-idealplusing.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PowerSupplyIdealplusingComponent {
  private markdownService = inject(MarkdownService);

  moduleNotes: WritableSignal<string> = signal(`
The **Idealplusing IDP-240-24** is a 240W 24V Din Rail Power Supply designed for industrial applications. It provides a stable and reliable power source for various components within the fireCNC system.

### Key Features
*   **Universal AC input**: Accepts a full range of AC input voltages.
*   **Built-in Protections**: Includes safeguards against short circuits, overload, over-voltage, and over-temperature.
*   **Passive Cooling**: Cooled by free air convection, eliminating the need for a fan.
*   **DIN Rail Mountable**: Can be installed on standard TS-35/7.5 or 15 DIN rails.
*   **UL 508 Approved**: Certified for use in industrial control equipment.
*   **High Reliability**: 100% full load burn-in tested to ensure performance under stress.
*   **3-Year Warranty**: Backed by a three-year manufacturer warranty.
  `);

  parseMarkdown(content: string): SafeHtml {
    return this.markdownService.parse(content);
  }
}
