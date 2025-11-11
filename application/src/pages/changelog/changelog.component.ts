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
import { ChangeDetectionStrategy, Component, Signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChangelogService, ChangelogEntry, ChangelogChange } from '../../services/changelog.service';

@Component({
  selector: 'app-changelog-page',
  imports: [CommonModule],
  templateUrl: './changelog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangelogComponent {
  private changelogService = inject(ChangelogService);
  
  entries: Signal<ChangelogEntry[]> = computed(() => {
    try {
      const content = this.changelogService.changelogEntries();
      return JSON.parse(content) as ChangelogEntry[];
    } catch (e) {
      console.error('Failed to parse changelog JSON:', e);
      return []; // Return an empty array on parse error to prevent UI crash
    }
  });

  getChangeTypeClass(type: ChangelogChange['type']): string {
    switch (type) {
      case 'Feature':
      case 'New Page':
        return 'bg-green-800 text-green-200';
      case 'Improvement':
        return 'bg-blue-800 text-blue-200';
      case 'Fix':
        return 'bg-red-800 text-red-200';
      case 'Refactor':
        return 'bg-purple-800 text-purple-200';
      case 'Chore':
        return 'bg-gray-700 text-gray-300';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  }
}
