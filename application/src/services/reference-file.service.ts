/**
 * @file src/services/reference-file.service.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * A service that simulates reading from a `reference.txt` file and provides
 * a signal with the latest content, with support for editing.
 */
import { Injectable, signal, WritableSignal, inject } from '@angular/core';
import { PersistenceService } from './persistence.service';

@Injectable({
  providedIn: 'root',
})
export class ReferenceFileService {
  private persistenceService = inject(PersistenceService);
  private readonly REFERENCE_CONTENT_KEY = 'fireCNC_referenceContent';
  referenceContent: WritableSignal<string> = signal('');

  constructor() {
    this.initializeReference();
  }
  
  private initializeReference(): void {
    // Try to load from persistence first
    const storedContent = this.persistenceService.getItem<string>(this.REFERENCE_CONTENT_KEY);

    if (storedContent !== null) {
      this.referenceContent.set(storedContent);
    } else {
      // If no content can be found, set the default from user prompt.
      const initialContent = `### Network Connection Logic
Connects to **Ethernet** if the link is up. If not up, tries **Wi-Fi** connection. If no Wi-Fi connection, falls back to a static IP of \`192.168.1.20\` for the Ethernet.

If the internet connection drops, the device will first attempt to reconnect using the last known working configuration before retrying the full sequence (Ethernet > Wi-Fi > Static Ethernet).

### NTP Time Synchronization
- Configure DHCP to use NTP Server from DHCP Server and update RTC.
- If NTP server is not found via DHCP, use NTP Server default from \`config.json\`.
- The NTP Server config is \`NETWORK.NTP_SERVER\` with a default of \`192.168.0.1\`.

### Onboard LED Indicators
- A successful connection via **DHCP** is indicated by **BLUE** flashes from the onboard LED for 3 seconds.
- A successful connection using the **Static IP** is indicated by **GREEN** flashes from the onboard LED for 3 seconds.`;
      this.referenceContent.set(initialContent);
      this.persistenceService.setItem(this.REFERENCE_CONTENT_KEY, initialContent);
    }
  }

  /**
   * Saves the provided string content.
   * @param content The new reference content.
   * @returns True if successful.
   */
  saveReference(content: string): boolean {
    this.referenceContent.set(content);
    this.persistenceService.setItem(this.REFERENCE_CONTENT_KEY, content);
    console.log(`[Simulating File Write] Overwriting /data/pages/reference.txt with new content.`);
    return true;
  }
}