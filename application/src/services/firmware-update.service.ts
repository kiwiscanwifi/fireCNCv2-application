/**
 * @file src/services/firmware-update.service.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Service to check for firmware updates from a GitHub repository.
 */
import { Injectable, signal, WritableSignal, inject, effect, OnDestroy } from '@angular/core';
import { versions } from '../version';
import { ArduinoService } from './arduino.service';
import { PersistenceService } from './persistence.service'; // NEW: Import PersistenceService

export interface FirmwareUpdateInfo {
  version: string;
  releaseDate: string;
}

const GITHUB_REPO = 'kiwiscanwifi/fireCNCv2';
const APPLICATION_VERSION_FILE_PATH = 'application/src/version.ts'; // Simulated for app version
const FIRMWARE_VERSION_FILE_PATH = 'firmware/src/version.ts'; // Simulated for firmware version
const DISMISSED_VERSIONS_KEY = 'fireCNC_dismissedFirmwareVersions'; // NEW: Persistence key

@Injectable({
  providedIn: 'root',
})
export class FirmwareUpdateService implements OnDestroy { // Implement OnDestroy
  private arduinoService = inject(ArduinoService);
  private persistenceService = inject(PersistenceService); // NEW: Inject PersistenceService
  
  // Existing signal for firmware update alert (comparing running firmware to a much newer simulated version)
  updateAvailable: WritableSignal<FirmwareUpdateInfo | null> = signal(null);

  // NEW: Signals for simulated latest application and firmware versions from GitHub (actual versions on GitHub)
  githubAppVersionInfo: WritableSignal<FirmwareUpdateInfo | null> = signal(null);
  githubFirmwareVersionInfo: WritableSignal<FirmwareUpdateInfo | null> = signal(null);

  // NEW: Signal to hold dismissed versions
  private dismissedFirmwareVersions: WritableSignal<string[]>;
  // NEW: Signal to control the CSS fade-out animation for the banner
  applyFadeOutSignal: WritableSignal<boolean> = signal(false);

  private checkInterval: number | undefined;
  // NEW: Timeout for auto-dismissal logic
  private autoDismissTimeout: number | undefined;

  constructor() {
    // Initialize dismissed versions from persistence
    const storedDismissed = this.persistenceService.getItem<string[]>(DISMISSED_VERSIONS_KEY);
    this.dismissedFirmwareVersions = signal(storedDismissed || []);

    // Set up a reactive effect that responds to config changes
    effect(() => {
      const config = this.arduinoService.watchdogConfig();
      const isEnabled = config.FIRMWARE;
      const checkMinutes = config.FIRMWARE_TIME;

      // Always clear the previous interval when the config changes
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
      this.clearDismissalTimers(); // Clear dismissal timers on config change

      if (isEnabled) {
        // Perform an initial check immediately when enabled or on startup
        this.checkForUpdate();

        // Set up a new interval if the time is greater than 0
        if (checkMinutes > 0) {
          const checkMillis = checkMinutes * 60 * 1000;
          this.checkInterval = window.setInterval(() => {
            this.checkForUpdate();
          }, checkMillis);
        }
      } else {
        // If disabled, ensure all update/latest available messages are cleared
        this.updateAvailable.set(null);
        this.githubAppVersionInfo.set(null);
        this.githubFirmwareVersionInfo.set(null);
        // Do NOT clear dismissed versions, as they should persist across disables.
      }
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.checkInterval);
    this.clearDismissalTimers(); // Ensure cleanup on destroy
  }

  // NEW: Helper to clear all active dismissal timers
  clearDismissalTimers(): void {
    clearTimeout(this.autoDismissTimeout);
    this.autoDismissTimeout = undefined;
    this.applyFadeOutSignal.set(false); // Reset fade-out state
  }

  async checkForUpdate(): Promise<void> {
    try {
      // --- Simulate fetching latest versions from GitHub for display ---
      // For demonstration, these are hardcoded to be slightly ahead of local src/version.ts
      const simulatedGithubAppVersion = { version: '1.0.5', releaseDate: '2024-08-10' };
      const simulatedGithubFirmwareVersion = { version: '0.0.6', releaseDate: '2024-08-10' };

      this.githubAppVersionInfo.set(simulatedGithubAppVersion);
      this.githubFirmwareVersionInfo.set(simulatedGithubFirmwareVersion);
      console.log(`Simulated latest GitHub App version: v${simulatedGithubAppVersion.version}`);
      console.log(`Simulated latest GitHub Firmware version: v${simulatedGithubFirmwareVersion.version}`);

      // --- Existing logic for firmware update available alert ---
      // Simulate a newer version and date for firmware updates
      const remoteUpdateVersion = '9.9.9'; // A version guaranteed to be newer than current local
      const remoteUpdateDate = '2024-12-31'; // A future date

      if (this.isNewerVersion(remoteUpdateVersion, versions.FIRMWARE_VERSION)) {
        // NEW: Check if this version has been dismissed
        if (this.dismissedFirmwareVersions().includes(remoteUpdateVersion)) {
          console.log(`Simulated firmware update v${remoteUpdateVersion} is available but has been dismissed.`);
          this.updateAvailable.set(null);
          this.clearDismissalTimers(); // No update, so no timer needed
        } else {
          this.updateAvailable.set({
            version: remoteUpdateVersion,
            releaseDate: remoteUpdateDate,
          });
          console.log(`Simulated firmware update available: v${remoteUpdateVersion}`);
          
          // NEW: Schedule auto-dismissal and fade-out
          this.clearDismissalTimers(); // Ensure any previous auto-dismissal is cleared
          this.applyFadeOutSignal.set(false); // Ensure it's not fading out initially

          this.autoDismissTimeout = window.setTimeout(() => {
              this.applyFadeOutSignal.set(true); // Trigger fade-out animation
              // After fade-out animation duration, perform the actual dismissal
              window.setTimeout(() => {
                  this.dismissVersion(remoteUpdateVersion); // Dismiss this version
                  this.applyFadeOutSignal.set(false); // Reset for next time
              }, 300); // Assuming 0.3s fadeOutBanner duration from style.css
          }, 5000); // Stay visible for 5 seconds before fading out
        }
      } else {
        this.updateAvailable.set(null);
        this.clearDismissalTimers(); // No update, so no timer needed
        console.log('Simulated running firmware is up to date with remote update repository.');
      }
    } catch (error) {
      console.error('Failed to check for simulated firmware update:', error);
      this.updateAvailable.set(null);
      this.githubAppVersionInfo.set(null);
      this.githubFirmwareVersionInfo.set(null);
      this.clearDismissalTimers(); // Clear timers on error
    }
  }

  private isNewerVersion(remote: string, local: string): boolean {
    const remoteParts = remote.split('.').map(Number);
    const localParts = local.split('.').map(Number);

    for (let i = 0; i < Math.max(remoteParts.length, localParts.length); i++) {
      const remotePart = remoteParts[i] || 0;
      const localPart = localParts[i] || 0;

      if (isNaN(remotePart) || isNaN(localPart)) {
        return false;
      }

      if (remotePart > localPart) return true;
      if (remotePart < localPart) return false;
    }
    return false; // Versions are identical
  }

  // NEW: Method to dismiss a firmware update
  dismissVersion(version: string): void {
    this.dismissedFirmwareVersions.update(current => {
      if (!current.includes(version)) {
        const updated = [...current, version];
        this.persistenceService.setItem(DISMISSED_VERSIONS_KEY, updated);
        return updated;
      }
      return current;
    });
    this.clearDismissalTimers(); // Clear any pending auto-dismissal for this version
    // Re-check for updates to hide the dismissed one (this will call checkForUpdate which will clear the banner)
    this.checkForUpdate();
  }
}