/**
 * @file src/pages/logic/logic.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for the Logic page, which explains the application's internal workings.
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReferenceFileService } from '../../services/reference-file.service';
import { MarkdownService } from '../../services/markdown.service';
import { SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-logic',
  imports: [CommonModule, RouterLink],
  templateUrl: './logic.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogicComponent {
  private markdownService = inject(MarkdownService);
  private referenceFileService = inject(ReferenceFileService);

  readonly lastUpdated = '2024-08-12';
  referenceContent = this.referenceFileService.referenceContent;

  parseMarkdown(content: string): SafeHtml {
    return this.markdownService.parse(content);
  }
}
