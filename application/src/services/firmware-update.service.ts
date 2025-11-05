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
import { Injectable, signal, WritableSignal, inject, effect } from '@angular/core';
import { versions } from '../version';
import { ArduinoService } from './arduino.service';

export interface FirmwareUpdateInfo {
  version: string;
  releaseDate: string;
}

const GITHUB_REPO = 'kiwiscanwifi/fireCNCv2';
const VERSION_FILE_PATH = 'src/version.ts';
const CONTENT_URL = `https://api.github.com/repos/${GITHUB_REPO}/contents/${VERSION_FILE_PATH}`;


@Injectable({
  providedIn: 'root',
})
export class FirmwareUpdateService {
  private arduinoService = inject(ArduinoService);
  updateAvailable: WritableSignal<FirmwareUpdateInfo | null> = signal(null);
  private checkInterval: any;

  constructor() {
    // Set up a reactive effect that responds to config changes
    effect(() => {
      const config = this.arduinoService.watchdogConfig();
      const isEnabled = config.FIRMWARE;
      const checkMinutes = config.FIRMWARE_TIME;

      // Always clear the previous interval when the config changes
      clearInterval(this.checkInterval);
      this.checkInterval = null;

      if (isEnabled) {
        // Perform an initial check immediately when enabled or on startup
        this.checkForUpdate();

        // Set up a new interval if the time is greater than 0
        if (checkMinutes > 0) {
          const checkMillis = checkMinutes * 60 * 1000;
          this.checkInterval = setInterval(() => {
            this.checkForUpdate();
          }, checkMillis);
        }
      } else {
        // If disabled, ensure the update available message is cleared
        this.updateAvailable.set(null);
      }
    });
  }

  async checkForUpdate(): Promise<void> {
    try {
      const contentResponse = await fetch(CONTENT_URL);
      if (!contentResponse.ok) {
        throw new Error(`GitHub content API returned ${contentResponse.status}`);
      }
      const contentData = await contentResponse.json();
      const fileContent = atob(contentData.content);

      const versionMatch = fileContent.match(/FIRMWARE_VERSION\s*:\s*['"]([^'"]+)['"]/);
      const dateMatch = fileContent.match(/APP_RELEASE_DATE\s*:\s*['"]([^'"]+)['"]/);

      if (!versionMatch || !dateMatch) {
        throw new Error('Could not parse version.ts from GitHub');
      }

      const remoteVersion = versionMatch[1];
      const remoteDate = dateMatch[1];

      if (this.isNewerVersion(remoteVersion, versions.FIRMWARE_VERSION)) {
        this.updateAvailable.set({
          version: remoteVersion,
          releaseDate: remoteDate,
        });
        console.log(`Firmware update found: v${remoteVersion}`);
      } else {
        this.updateAvailable.set(null);
        console.log('Firmware is up to date.');
      }
    } catch (error) {
      console.error('Failed to check for firmware update:', error);
      this.updateAvailable.set(null);
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
}
