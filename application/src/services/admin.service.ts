import { Injectable, signal, WritableSignal, computed, inject } from '@angular/core';
import { PersistenceService } from './persistence.service';
import { ArduinoService } from './arduino.service'; // NEW: Import ArduinoService

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private persistenceService = inject(PersistenceService);
  private arduinoService = inject(ArduinoService); // NEW: Inject ArduinoService

  // State for administration mode
  isAdminMode: WritableSignal<boolean> = signal(false);

  // Expose a readable status for the UI, now based on the ArduinoService config
  hasSecurityCodeConfigured = computed(() => {
    const code = this.arduinoService.watchdogConfig().ACCESS_CODE;
    return code !== null && code.length > 0;
  });

  constructor() {
    // No explicit load needed here, as ArduinoService is initialized first
    // and its watchdogConfig will hold the loaded (or default '0000') ACCESS_CODE.
  }

  /**
   * Attempts to log into administration mode with the given code.
   * @param code The access code entered by the user.
   * @returns True if login is successful, false otherwise.
   */
  login(code: string): boolean {
    const configuredCode = this.arduinoService.watchdogConfig().ACCESS_CODE;
    if (configuredCode && code === configuredCode) {
      this.isAdminMode.set(true);
      console.log('Admin mode enabled.');
      return true;
    }
    console.warn('Incorrect access code entered.');
    return false;
  }

  /**
   * Logs out of administration mode.
   */
  logout(): void {
    this.isAdminMode.set(false);
    console.log('Admin mode disabled.');
  }

  /**
   * Retrieves the current security code (for display in settings, should be protected).
   * It's exposed here for the SecuritySettingsComponent to display and pre-fill its form.
   * @returns The security code string or null.
   */
  getCurrentSecurityCode(): string {
    return this.arduinoService.watchdogConfig().ACCESS_CODE;
  }
}