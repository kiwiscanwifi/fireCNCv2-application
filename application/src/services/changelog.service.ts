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
// FIX: Import 'inject' from '@angular/core'
import { Injectable, signal, WritableSignal, inject } from '@angular/core';
import { PersistenceService } from './persistence.service';

@Injectable({
  providedIn: 'root',
})
export class ChangelogService {
  private persistenceService = inject(PersistenceService);
  private readonly CHANGELOG_CONTENT_KEY = 'fireCNC_changelogContent';

  changelogEntries: WritableSignal<string> = signal('');
  parseError: WritableSignal<string | null> = signal(null); // Retained for compatibility but will not be set by this service.

  constructor() {
    this.initializeChangelog();
  }
  
  private initializeChangelog(): void {
    const storedContent = this.persistenceService.getItem<string>(this.CHANGELOG_CONTENT_KEY);

    if (storedContent !== null) {
      this.changelogEntries.set(storedContent);
    } else {
      const today = new Date().toISOString().split('T')[0];
      const initialMarkdown = `### ${today}
- **Refactored Digital I/O Configuration**: Moved \`digitalOutputsConfig\` and \`digitalInputsConfig\` from \`DashboardSettingsService\` to \`ArduinoService\` for better data ownership and to break circular dependencies.
- **Editable Digital I/O Widget Titles**: Added form controls to \`OnboardSettingsComponent\` and logic in \`DashboardSettingsService\` to allow users to customize the titles of the Digital Outputs and Digital Inputs dashboard widgets.
- **New Page: Onboard I/O Settings**: Introduced \`/settings/onboard\` to manage names and enabled states for onboard digital inputs and outputs, separate from the main \`DashboardSettingsComponent\`.
- **Integrated Security Settings**: Removed the standalone \`SecuritySettingsComponent\` and integrated its functionality directly into \`SettingsPageComponent\` under a new collapsible "Security Settings" panel.
- **Enhanced Network Page**: Updated \`NetworkPageComponent\` to dynamically enable/disable fields for Wi-Fi SSID/password, AP settings, DHCP server, and Station mode static IP based on the selected Wi-Fi mode and IP assignment.
- **Dynamic Network Display in Header**: The header's IP address display (\`AppComponent\`) now dynamically shows either Ethernet IP or active Wi-Fi (Station/AP) IP with signal strength/client count, based on connection status and configured mode.
- **Improved LinuxCNC MPG Component**:
  - Implemented dynamic axis display based on the enabled ports in the loaded MPG module.
  - Added drag-to-spin functionality for the jog dial, simulating detents.
  - Implemented keyboard shortcuts for jogging (Arrow keys for X/Y, +/- for Z).
- Added **Changelog** feature to track application updates.
- Changelog is displayed in the UI.

### 2024-08-03
1. Implemented an editable view for \`config.json\`.
2. Fixed a bug where the editor \`textarea\` was not responsive.

### 2024-08-02
- Added SNMP agent monitoring page.
- Implemented SNMP configuration management.
- Created a viewer for \`snmp_trap.log\`.

### 2024-08-01
- Initial application setup and \`dashboard\` implementation.
`;
      this.changelogEntries.set(initialMarkdown);
      this.persistenceService.setItem(this.CHANGELOG_CONTENT_KEY, initialMarkdown);
    }
  }

  /**
   * Saves the provided Markdown string to the changelog.
   * @param markdownContent The new changelog content as a Markdown string.
   * @returns True if successful, false otherwise.
   */
  saveChangelog(markdownContent: string): boolean {
    this.changelogEntries.set(markdownContent);
    this.persistenceService.setItem(this.CHANGELOG_CONTENT_KEY, markdownContent);
    this.parseError.set(null); // Clear any old errors
    console.log(`[Simulating Log Write] Overwriting /logs/changelog.log with new Markdown content.`);
    return true;
  }
}