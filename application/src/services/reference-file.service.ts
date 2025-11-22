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
      const initialContent = `### Initialization & Network Logic
*   **Configuration Loading:** On startup, the system loads its configuration from persistent storage (simulated as browser \`localStorage\`). If a Remote Config URL is configured and enabled, it will be used as the primary source. If no configuration is found, a default set of values is used. A successful load is audibly confirmed with a single beep.
*   **Network Priority:** The device prioritizes the wired **Ethernet** connection. If the Ethernet connection is unavailable, it will attempt to connect via **Wi-Fi** (either as a 'Station' to an existing network or by creating its own 'Access Point', depending on the Network Settings).
*   **NTP Time Sync:** Upon a successful network connection, the system synchronizes its Real-Time Clock (RTC) with an NTP server obtained from DHCP or specified in the Network Settings configuration.
*   **Onboard LED Indicators:** The onboard LED provides immediate connection feedback: flashing **BLUE** for a successful DHCP connection and **GREEN** for a static IP connection. The flashing stops after 3 seconds, but the LED remains lit, indicating the active network interface.

### System Stability & Watchdogs
*   **System Watchdog:** A software watchdog monitors the UI-to-device communication. If the WebSocket connection remains unresponsive for a configured duration (default: **120 seconds**, configurable in General Settings), it triggers a system reboot to recover from a potential freeze.
*   **ICMP Watchdog:** An optional network watchdog periodically pings a configured IP address (e.g., a router or external internet target). If the target becomes unreachable for a set number of consecutive attempts, the device reboots, assuming a critical network failure has occurred that requires a full network stack reset. This is configurable in General Settings.

### Visuals & Motion Control
*   **Startup Sequence:** On boot, the LED strips perform a diagnostic sequence: the X-axis strip flashes blue, while the Y/YY strips show a "Knight Rider" scanning effect. This provides visual confirmation that the LED subsystems are initializing.
*   **Running State:** During normal operation, the LEDs display a base color (configurable in LED Settings). A green segment indicates the current servo position on the rail. The ends of the strips will flash red if a limit switch for that axis is triggered.
*   **Idle State:** If a servo has not moved for a configured period (set in LED Settings), its corresponding LED strip will dim to a configured percentage to save power and reduce light pollution.
*   **Error States:** Critical errors provide clear visual warnings.
    *   **SD Card Failure:** All LED strips flash red for 10 seconds, then remain solid red.
    *   **High Storage Usage:** If SD Card, SRAM, or other storage usage exceeds its configured threshold (set in Storage Monitoring Settings), the onboard LED will flash red for 20 seconds, and an SNMP trap is sent.
*   **Chase Effect:** A periodic "chase" animation can be enabled (in LED Settings), which sends a purple scanner light across all strips when their color is set to white.

### Monitoring & SNMP Integration
*   **Agent:** A simulated SNMP agent is available, exposing key system metrics (voltage, temperature, storage, etc.) via standard OIDs for network monitoring tools. You can view this data on the System Status page.
*   **Traps:** The system sends SNMP traps (notifications) for important events. The severity level for which traps are sent is configurable (e.g., ERROR, WARN, INFO) in Network Settings. Events that can trigger traps include:
    *   System log entries matching the configured severity level (viewable in System Log).
    *   GPIO digital input state changes.
    *   Storage usage (SD card, SRAM, etc.) exceeding configured thresholds.
    *   Critical hardware failures (e.g., I/O expander or SD card initialization failure).
The history of sent traps can be found on the SNMP Log page.

### Power Management & Safety
*   **Reboot Reasons:** The system logs the reason for every reboot, which can be viewed in the System Log. Reasons include: User-initiated reboot, Watchdog timeout, ICMP watchdog timeout, SD card failure, and Shutdown Pin activation.
*   **Shutdown Pin:** A dedicated GPIO pin can be configured (in General Settings) to trigger a graceful shutdown. When this pin goes HIGH, the system initiates a shutdown sequence, including a 5-second blue fade-out on the LEDs before rebooting.

### Security & Admin Access
*   **Access Control:** Advanced features are protected by an Admin Mode. This is enabled by providing a 4-digit access code (default: \`0000\`), which is configured in the General Settings.
*   **Unlocked Features:** When enabled, Admin Mode grants access to potentially sensitive operations, including the interactive shell, raw file editors (for configuration, modules, etc.), and Remote Config settings.
`;
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
