import { ChangeDetectionStrategy, Component, inject, signal, WritableSignal } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MarkdownService } from '../../services/markdown.service';
import { SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-distribution-panel-relay',
  imports: [CommonModule, NgOptimizedImage, RouterLink],
  templateUrl: './distribution-panel-relay.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DistributionPanelRelayComponent {
  private markdownService = inject(MarkdownService);

  moduleNotes: WritableSignal<string> = signal(`
The **RT-RXG11D24-04M-F** is a 4-channel DIN rail mountable relay module designed for power distribution and switching in industrial control panels. It operates at DC 24V, making it a perfect match for the primary power supply in the fireCNC system. It's ideal for controlling high-power peripherals such as spindles, vacuum systems, or coolant pumps.

### Key Features
*   **4-Channel Relay**: Provides four independent relay channels for switching multiple devices.
*   **DC 24V Operation**: Natively compatible with standard industrial 24V power systems.
*   **DIN Rail Mountable**: Designed for easy and secure installation within a control cabinet.
*   **LED Indicators**: Each relay channel has a dedicated LED indicator to show its current state (ON/OFF).
*   **Robust Design**: Built for industrial environments, offering reliable switching of inductive and resistive loads.
*   **Power Distribution**: Simplifies wiring by acting as a centralized distribution point for switched power.
  `);

  parseMarkdown(content: string): SafeHtml {
    return this.markdownService.parse(content);
  }
}
