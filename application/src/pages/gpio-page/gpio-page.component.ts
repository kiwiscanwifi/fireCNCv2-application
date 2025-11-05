/**
 * @file src/pages/gpio-page/gpio-page.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for the GPIO Reference page, which displays the pinout guide.
 */
import { ChangeDetectionStrategy, Component, Signal, inject } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GpioInfoComponent } from '../../components/gpio-info/gpio-info.component';
import { ReferenceFileService } from '../../services/reference-file.service';
import { SafeHtml } from '@angular/platform-browser';
import { MarkdownService } from '../../services/markdown.service';

@Component({
  selector: 'app-gpio-page',
  imports: [CommonModule, GpioInfoComponent, NgOptimizedImage, RouterLink],
  templateUrl: './gpio-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GpioPageComponent {
  private referenceFileService = inject(ReferenceFileService);
  private markdownService = inject(MarkdownService);
  
  referenceContent: Signal<string> = this.referenceFileService.referenceContent;

  parseMarkdown(content: string): SafeHtml {
    return this.markdownService.parse(content);
  }
}