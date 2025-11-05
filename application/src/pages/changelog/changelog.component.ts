/**
 * @file src/pages/changelog/changelog.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for the Changelog page, which displays a history of
 * application updates.
 */
import { ChangeDetectionStrategy, Component, Signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChangelogService } from '../../services/changelog.service';
import { SafeHtml } from '@angular/platform-browser';
import { MarkdownService } from '../../services/markdown.service';

@Component({
  selector: 'app-changelog-page',
  imports: [CommonModule],
  templateUrl: './changelog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangelogComponent {
  private changelogService = inject(ChangelogService);
  private markdownService = inject(MarkdownService);
  
  changelog: Signal<string> = this.changelogService.changelogEntries;

  parseMarkdown(content: string): SafeHtml {
    return this.markdownService.parse(content);
  }
}