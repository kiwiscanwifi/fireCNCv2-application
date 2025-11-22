import { ChangeDetectionStrategy, Component, Signal, signal, computed, inject, effect, OnDestroy, WritableSignal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { WebSocketService, ConnectionStatus } from './services/websocket.service';
import { SnmpConfigService } from './services/snmp-config.service';
// FIX: Import InternetStatus from the arduino service facade
import { ArduinoService, LedState, WifiStatus, WifiConfig, InternetStatus } from './services/arduino.service';
import { ConfirmationModalComponent } from './components/confirmation-modal/confirmation-modal.component';
import { AlexaService } from './services/alexa.service';
import { versions } from './version';
import { FirmwareUpdateService, FirmwareUpdateInfo } from './services/firmware-update.service';
import { ConfigFileService } from './services/config-file.service';
// FIX: Remove incorrect InternetStatus import from here
import { InternetConnectivityService } from './services/internet-connectivity.service';
import { ModuleService } from './services/module.service';
import { AdminService } from './services/admin.service';
import { AccessCodeModalComponent } from './components/access-code-modal/access-code-modal.component';
import { PersistenceService } from './services/persistence.service';
import { NotificationService, GlobalNotification } from './services/notification.service'; // NEW
import { SettingsLandingComponent } from './pages/settings-landing/settings-landing.component';
import { InformationLandingComponent } from './pages/information-landing/information-landing.component';
import { ActivityLandingComponent } from './pages/activity-landing/activity-landing.component';
import { LanguageService } from './services/language.service';
import { TranslatePipe } from './pipes/translate.pipe';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ConfirmationModalComponent,
    DatePipe,
    AccessCodeModalComponent,
    TranslatePipe,
  ],
})
export class AppComponent implements OnDestroy {
  protected webSocketService = inject(WebSocketService);
  protected snmpConfigService = inject(SnmpConfigService);
  protected arduinoService = inject(ArduinoService);
  protected alexaService = inject(AlexaService);
  protected firmwareUpdateService = inject(FirmwareUpdateService);
  private configFileService = inject(ConfigFileService);
  protected internetConnectivityService = inject(InternetConnectivityService);
  private moduleService = inject(ModuleService);
  protected adminService = inject(AdminService);
  protected router: Router = inject(Router);
  protected persistenceService = inject(PersistenceService);
  protected notificationService = inject(NotificationService);
  protected languageService = inject(LanguageService);

  private readonly MOBILE_MENU_STATE_KEY = 'fireCNC_mobileMenuOpen';

  // Directly expose signals from services
  connectionStatus: Signal<ConnectionStatus> = this.webSocketService.connectionStatus;
  internetStatus: Signal<InternetStatus> = this.internetConnectivityService.status;
  linuxCncConnectionStatus: Signal<ConnectionStatus> = this.arduinoService.linuxCncConnectionStatus;
  linuxCncLastConnectedTimestamp: Signal<number | null> = this.arduinoService.linuxCncLastConnectedTimestamp;
  showRebootConfirmation = signal(false);
  trapsEnabled: Signal<boolean> = computed(() => this.snmpConfigService.config().TRAPS_ENABLED);
  isAlexaEnabled: Signal<boolean> = this.alexaService.isAlexaEnabled;
  onboardLed: Signal<LedState> = this.arduinoService.onboardLed;
  readonly appVersion = versions.APP_VERSION;
  readonly appReleaseDate = versions.APP_RELEASE_DATE;
  firmwareUpdate: Signal<FirmwareUpdateInfo | null> = this.firmwareUpdateService.updateAvailable;
  ethernetActivity = signal(false);
  private activityInterval: number | null = null;

  wifiStatus: Signal<WifiStatus> = this.arduinoService.wifiStatus;
  wifiConfig: Signal<WifiConfig> = this.arduinoService.wifiConfig;
  showMobileMenu: WritableSignal<boolean>;

  isAdminMode: Signal<boolean> = this.adminService.isAdminMode;
  showAccessCodeModal = signal(false);
  loginError: WritableSignal<string | null> = signal(null);
  preLoginRouteUrl: WritableSignal<string | null> = signal(null);

  showRebootOverlay: WritableSignal<boolean> = signal(false);
  private previousRouteUrl: WritableSignal<string | null> = signal(null);
  applyFirmwareFadeOut: Signal<boolean> = this.firmwareUpdateService.applyFadeOutSignal; 

  // Computed properties for MPG/Pendant link
  mpgModules = computed(() => this.moduleService.installedModules().filter(m => m.function === 'MPG'));
  showPendantLink = computed(() => this.mpgModules().length > 0);
  pendantLink = computed(() => {
    const firstMpg = this.mpgModules()[0];
    if (!firstMpg) {
      return '/';
    }
    return firstMpg.protocol === 'LinuxCNC API' ? '/linuxcnc-mpg' : '/mpg';
  });

  wifiSignalBars = computed(() => {
    const status = this.arduinoService.wifiStatus();
    if (status.status !== 'connected') {
      return 0;
    }
    const strength = status.signalStrength;
    if (strength > 80) return 4;
    if (strength > 55) return 3;
    if (strength > 30) return 2;
    if (strength > 0) return 1;
    return 0;
  });

  githubAppVersionInfo: Signal<FirmwareUpdateInfo | null> = this.firmwareUpdateService.githubAppVersionInfo;
  internetStatusColorClass: Signal<string> = computed(() => this.arduinoService.getConnectionStatusColorClass(this.internetStatus()));
  internetStatusText: Signal<string> = computed(() => this.arduinoService.getConnectionStatusText(this.internetStatus()));

  // NEW: Remote Config Status
  remoteConfigStatus = this.configFileService.remoteConfigStatus;
  remoteConfigStatusIcon = computed(() => {
    switch(this.remoteConfigStatus()) {
        case 'remote': return 'fa-cloud text-green-400';
        case 'local': return 'fa-server text-gray-400';
        case 'loading': return 'fa-cloud-arrow-down text-yellow-400 animate-pulse';
        case 'error': return 'fa-cloud text-red-400';
        default: return 'fa-question-circle text-gray-500';
    }
  });
  remoteConfigStatusTitle = computed(() => {
      switch(this.remoteConfigStatus()) {
          case 'remote': return 'Configuration loaded from remote URL.';
          case 'local': return 'Using local/cached configuration.';
          case 'loading': return 'Loading remote configuration...';
          case 'error': return 'Failed to load remote configuration. Using fallback.';
          default: return 'Configuration status is unknown.';
      }
  });

  // State for new clickable dropdowns
  isSettingsDropdownOpen = signal(false);
  isSystemDropdownOpen = signal(false);
  isInformationDropdownOpen = signal(false);
  isActivityDropdownOpen = signal(false);
  private dropdownCloseTimeout: number | undefined;

  constructor() {
    const storedMenuState = this.persistenceService.getItem<boolean>(this.MOBILE_MENU_STATE_KEY);
    this.showMobileMenu = signal(storedMenuState ?? false);
    this.configFileService.initializeConfig();

    effect(() => {
      if (this.connectionStatus() === 'connected') {
        this.startEthernetActivitySimulation();
      } else {
        this.stopEthernetActivitySimulation();
      }
    });

    effect(() => {
      const url = this.arduinoService.watchdogConfig().WEBSOCKET_URL;
      this.webSocketService.simulateConnect();
    });

    effect(() => {
      const wsStatus = this.webSocketService.connectionStatus();

      if (wsStatus === 'restarting') {
        this.showRebootOverlay.set(true);
      } else if (wsStatus === 'connected' && this.showRebootOverlay()) {
        this.showRebootOverlay.set(false);
        const prevUrl = this.previousRouteUrl();
        if (prevUrl) {
          this.router.navigateByUrl(prevUrl);
          this.previousRouteUrl.set(null);
        } else {
          this.router.navigate(['/dashboard']);
        }
      }
    });

    effect(() => {
      this.persistenceService.setItem(this.MOBILE_MENU_STATE_KEY, this.showMobileMenu());
    });
  }

  ngOnDestroy(): void {
    this.stopEthernetActivitySimulation();
    this.firmwareUpdateService.clearDismissalTimers();
  }

  private startEthernetActivitySimulation(): void {
    if (this.activityInterval !== null) { return; }
    this.activityInterval = window.setInterval(() => {
      if (Math.random() > 0.6) {
        this.ethernetActivity.set(true);
        window.setTimeout(() => this.ethernetActivity.set(false), 100 + Math.random() * 50);
      }
    }, 300);
  }

  private stopEthernetActivitySimulation(): void {
    if (this.activityInterval !== null) {
      clearInterval(this.activityInterval);
      this.activityInterval = null;
    }
    this.ethernetActivity.set(false);
  }

  rebootDevice(): void {
    this.showRebootConfirmation.set(true);
  }

  handleRebootConfirm(): void {
    this.previousRouteUrl.set(this.router.url);
    this.arduinoService.rebootDevice();
    this.showRebootConfirmation.set(false);
    this.showRebootOverlay.set(true);
  }

  handleRebootCancel(): void {
    this.showRebootConfirmation.set(false);
  }

  hexToRgba(hex: string, alpha: number = 1): string {
    if (!hex || hex === 'off' || hex.length < 4) {
      return 'rgba(128, 128, 128, 0)';
    }
    let c: number;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = Number('0x' + hex.substring(1).split('').map((char, i, arr) => arr.length === 3 ? char + char : char).join(''));
        return `rgba(${[(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',')},${alpha})`;
    }
    return 'rgba(128, 128, 128, 0)';
  }

  flashOnboardLed(): void {
    const originalState = this.onboardLed();
    if (originalState.color === '#800080' && originalState.flashing) {
      return;
    }

    this.arduinoService.updateOnboardLedState({ color: '#800080', flashing: true, brightness: 255 });

    window.setTimeout(() => {
      const currentState = this.onboardLed();
      if (currentState.color === '#800080' && currentState.flashing) {
        this.arduinoService.updateOnboardLedState(originalState);
      }
    }, 3000);
  }

  toggleMobileMenu(): void {
    this.showMobileMenu.update(v => !v);
  }

  openAccessCodeModal(): void {
    this.preLoginRouteUrl.set(this.router.url);
    this.showAccessCodeModal.set(true);
    this.loginError.set(null);
  }

  handleLogin(code: string): void {
    if (this.adminService.login(code)) {
      this.showAccessCodeModal.set(false);
      this.loginError.set(null);
      const prevUrl = this.preLoginRouteUrl();
      if (prevUrl) {
        this.router.navigateByUrl(prevUrl);
      } else {
        this.router.navigate(['/dashboard']);
      }
      this.preLoginRouteUrl.set(null);
    } else {
      this.loginError.set('Incorrect access code. Please try again.');
    }
  }

  handleLogout(): void {
    this.adminService.logout();
    this.router.navigate(['/dashboard']);
  }

  dismissFirmwareUpdate(version: string): void {
    // Trigger fade-out animation before dismissing
    this.firmwareUpdateService.applyFadeOutSignal.set(true);
    window.setTimeout(() => {
        this.firmwareUpdateService.dismissVersion(version);
    }, 300); // Corresponds to animation duration in style.css
  }

  // --- New Dropdown Logic ---

  private getDropdownSignal(menu: string): WritableSignal<boolean> | null {
    switch (menu) {
      case 'settings': return this.isSettingsDropdownOpen;
      case 'system': return this.isSystemDropdownOpen;
      case 'information': return this.isInformationDropdownOpen;
      case 'activity': return this.isActivityDropdownOpen;
      default: return null;
    }
  }

  closeAllDropdowns(exclude?: string): void {
    if (exclude !== 'settings') this.isSettingsDropdownOpen.set(false);
    if (exclude !== 'system') this.isSystemDropdownOpen.set(false);
    if (exclude !== 'information') this.isInformationDropdownOpen.set(false);
    if (exclude !== 'activity') this.isActivityDropdownOpen.set(false);
  }

  toggleDropdown(menu: 'settings' | 'system' | 'information' | 'activity'): void {
    const targetSignal = this.getDropdownSignal(menu);
    if (!targetSignal) return;
  
    const isOpening = !targetSignal();
    this.closeAllDropdowns(); // Close all before opening/toggling
    
    if (isOpening) {
      targetSignal.set(true);
      // Fire the on-open logic
      const update = this.firmwareUpdate();
      if (update) this.dismissFirmwareUpdate(update.version);
      this.notificationService.clearAllWithFade();
    }
  }
  
  openDropdown(menu: 'settings' | 'system' | 'information' | 'activity'): void {
    clearTimeout(this.dropdownCloseTimeout);
    this.closeAllDropdowns();
    const targetSignal = this.getDropdownSignal(menu);
    if (targetSignal) {
      targetSignal.set(true);
      // Fire the on-open logic
      const update = this.firmwareUpdate();
      if (update) this.dismissFirmwareUpdate(update.version);
      this.notificationService.clearAllWithFade();
    }
  }
  
  closeDropdown(menu: 'settings' | 'system' | 'information' | 'activity'): void {
    this.dropdownCloseTimeout = window.setTimeout(() => {
      const targetSignal = this.getDropdownSignal(menu);
      if (targetSignal) {
        targetSignal.set(false);
      }
    }, 100);
  }

  // --- End New Dropdown Logic ---

  // NEW: Helper methods for stacked notifications
  getNotificationClass(type: GlobalNotification['type']): string {
    switch (type) {
      case 'error': return 'bg-red-900/90 border-red-700 text-red-100';
      case 'success': return 'bg-green-900/90 border-green-700 text-green-100';
      case 'alexa': return 'bg-cyan-800/90 border-cyan-600 text-cyan-100';
    }
  }

  getNotificationIcon(type: GlobalNotification['type']): string {
    switch (type) {
      case 'error': return 'fa-solid fa-triangle-exclamation text-red-400';
      case 'success': return 'fa-solid fa-check text-green-400';
      case 'alexa': return 'fa-brands fa-amazon text-cyan-300';
    }
  }

  getNotificationTitle(type: GlobalNotification['type']): string {
    switch (type) {
      case 'error': return this.languageService.translate('notification.error.title');
      case 'success': return this.languageService.translate('notification.success.title');
      case 'alexa': return this.languageService.translate('notification.alexa.title');
    }
  }
}