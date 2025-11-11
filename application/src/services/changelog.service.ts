/**
 * @file src/services/changelog.service.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * A service that simulates reading from a `changelog.log` file and provides
 * a signal with the latest changelog entries, with support for editing.
 */
import { Injectable, signal, WritableSignal, inject } from '@angular/core';
import { PersistenceService } from './persistence.service';

export interface ChangelogChange {
  type: 'Feature' | 'Improvement' | 'Fix' | 'Refactor' | 'Chore' | 'New Page';
  description: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: ChangelogChange[];
}

const initialChangelogData: ChangelogEntry[] = [
  {
    version: '1.0.6',
    date: '2024-08-16',
    changes: [
      { type: 'Chore', description: 'Incremented application version to 1.0.6.' },
      { type: 'Chore', description: 'Updated embedded controller firmware source to version 0.0.7.' },
    ]
  },
  {
    version: '1.0.5',
    date: '2024-08-08',
    changes: [
      { type: 'Feature', description: 'Redesigned the changelog page with a structured, card-based layout for improved readability.' },
      { type: 'Improvement', description: 'Upgraded the changelog editor to use the CodeMirror editor for a better JSON editing experience, consistent with other app editors.' },
      { type: 'Chore', description: 'Incremented application version to 1.0.5.' },
    ]
  },
  {
    version: '1.0.4',
    date: '2024-08-08',
    changes: [
      { type: 'Refactor', description: 'Moved `digitalOutputsConfig` and `digitalInputsConfig` to `ArduinoService` to break circular dependencies.' },
      { type: 'Feature', description: 'Added editable titles for the Digital I/O dashboard widgets via the new Onboard I/O settings page.' },
      { type: 'New Page', description: 'Introduced `/settings/onboard` for managing onboard digital inputs and outputs.' },
      { type: 'Refactor', description: 'Integrated Security Settings directly into the main Settings page.' },
      { type: 'Improvement', description: 'Enhanced the Network page with dynamic fields based on Wi-Fi mode selection.' },
      { type: 'Improvement', description: 'The header IP display now dynamically shows the active network interface (Ethernet or Wi-Fi).' },
      { type: 'Improvement', description: 'Improved the LinuxCNC MPG component with dynamic axis display, drag-to-spin jog dial, and keyboard shortcuts.' },
    ]
  },
  {
    version: '1.0.3',
    date: '2024-08-03',
    changes: [
      { type: 'Feature', description: 'Implemented an editable view for `config.json` using the CodeMirror editor.' },
      { type: 'Fix', description: 'Fixed a bug where the editor `textarea` was not responsive.' },
    ]
  },
  {
    version: '1.0.2',
    date: '2024-08-02',
    changes: [
      { type: 'Feature', description: 'Added the SNMP agent monitoring page to display system metrics.' },
      { type: 'Feature', description: 'Implemented SNMP configuration management within the Network settings page.' },
      { type: 'Feature', description: 'Created a log viewer for sent SNMP traps.' },
    ]
  },
  {
    version: '1.0.1',
    date: '2024-08-01',
    changes: [
      { type: 'Feature', description: 'Initial application setup and implementation of the main dashboard with I/O widgets.' },
    ]
  }
];


@Injectable({
  providedIn: 'root',
})
export class ChangelogService {
  private persistenceService = inject(PersistenceService);
  private readonly CHANGELOG_CONTENT_KEY = 'fireCNC_changelogContent';

  changelogEntries: WritableSignal<string> = signal('');
  parseError: WritableSignal<string | null> = signal(null);

  constructor() {
    this.initializeChangelog();
  }
  
  private initializeChangelog(): void {
    const storedContent = this.persistenceService.getItem<string>(this.CHANGELOG_CONTENT_KEY);

    if (storedContent) {
      try {
        // Validate that stored content is valid JSON before setting it
        JSON.parse(storedContent);
        this.changelogEntries.set(storedContent);
      } catch (e) {
        // If stored content is invalid, fall back to default
        this.setDefaultChangelog();
      }
    } else {
      this.setDefaultChangelog();
    }
  }

  private setDefaultChangelog(): void {
    const initialJson = JSON.stringify(initialChangelogData, null, 2);
    this.changelogEntries.set(initialJson);
    this.persistenceService.setItem(this.CHANGELOG_CONTENT_KEY, initialJson);
  }

  /**
   * Saves the provided JSON string to the changelog.
   * @param jsonContent The new changelog content as a JSON string.
   * @returns True if successful, false otherwise.
   */
  saveChangelog(jsonContent: string): boolean {
    try {
      // Validate that the new content is valid JSON
      JSON.parse(jsonContent);
      this.changelogEntries.set(jsonContent);
      this.persistenceService.setItem(this.CHANGELOG_CONTENT_KEY, jsonContent);
      this.parseError.set(null); // Clear any old errors
      console.log(`[Simulating Log Write] Overwriting /logs/changelog.log with new JSON content.`);
      return true;
    } catch (e) {
      this.parseError.set('Invalid JSON format. Please correct the syntax.');
      console.error('Failed to parse and save changelog JSON:', e);
      return false;
    }
  }
}