import { ChangeDetectionStrategy, Component, Signal, signal, computed, inject, effect, OnDestroy, WritableSignal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router'; // Import Router
import { WebSocketService, ConnectionStatus } from './services/websocket.service';
import { SnmpConfigService, ToastNotification } from './services/snmp-config.service';
import { ArduinoService, LedState, WifiStatus, WifiConfig } from './services/arduino.service'; // MODIFIED: Import WifiConfig
import { ConfirmationModalComponent } from './components/confirmation-modal/confirmation-modal.component';
import { AlexaService, AlexaNotification } from './services/alexa.service';
import { versions } from './version';
import { FirmwareUpdateService, FirmwareUpdateInfo } from './services/firmware-update.service';
import { ConfigFileService } from './services/config-file.service';
import { InternetConnectivityService, InternetStatus } from './services/internet-connectivity.service';
import { ModuleService } from './services/module.service';
import { AdminService } from './services/admin.service';
import { AccessCodeModalComponent } from './components/access-code-modal/access-code-modal.component';

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
  ],
})
export class AppComponent implements OnDestroy {
  protected webSocketService = inject(WebSocketService);
  protected snmpConfigService = inject(SnmpConfigService);
  protected arduinoService = inject(ArduinoService);
  protected alexaService = inject(AlexaService);
  private firmwareUpdateService = inject(FirmwareUpdateService);
  private configFileService = inject(ConfigFileService);
  protected internetConnectivityService = inject(InternetConnectivityService);
  private moduleService = inject(ModuleService);
  protected adminService = inject(AdminService);
  private router = inject(Router); // Inject Router
  
  // Directly expose signals from services
  connectionStatus: Signal<ConnectionStatus> = this.webSocketService.connectionStatus;
  internetStatus: Signal<InternetStatus> = this.internetConnectivityService.status;
  linuxCncConnectionStatus: Signal<ConnectionStatus> = this.arduinoService.linuxCncConnectionStatus;
  linuxCncLastConnectedTimestamp: Signal<number | null> = this.arduinoService.linuxCncLastConnectedTimestamp;
  lastSnmpNotification: Signal<ToastNotification | null> = this.snmpConfigService.lastNotification;
  lastAlexaNotification: Signal<AlexaNotification | null> = this.alexaService.lastNotification;
  showRebootConfirmation = signal(false);
  trapsEnabled: Signal<boolean> = computed(() => this.snmpConfigService.config().TRAPS_ENABLED);
  isAlexaEnabled: Signal<boolean> = this.alexaService.isAlexaEnabled;
  onboardLed: Signal<LedState> = this.arduinoService.onboardLed;
  readonly appVersion = versions.APP_VERSION;
  readonly appReleaseDate = versions.APP_RELEASE_DATE;
  firmwareUpdate: Signal<FirmwareUpdateInfo | null> = this.firmwareUpdateService.updateAvailable;
  ethernetActivity = signal(false);
  private activityInterval: any;
  
  wifiStatus: Signal<WifiStatus> = this.arduinoService.wifiStatus;
  wifiConfig: Signal<WifiConfig> = this.arduinoService.wifiConfig; // NEW: Expose wifiConfig
  showMobileMenu = signal(false); // New signal for mobile menu visibility

  // NEW: Admin mode state and modal visibility
  isAdminMode: Signal<boolean> = this.adminService.isAdminMode;
  showAccessCodeModal = signal(false);
  loginError: WritableSignal<string | null> = signal(null); // NEW: Signal for login errors
  preLoginRouteUrl: WritableSignal<string | null> = signal(null); // NEW: To store route before login modal

  // NEW: Signals for reboot overlay
  showRebootOverlay: WritableSignal<boolean> = signal(false);
  private previousRouteUrl: WritableSignal<string | null> = signal(null);

  // Computed properties for MPG/Pendant link
  mpgModules = computed(() => this.moduleService.installedModules().filter(m => m.function === 'MPG'));
  showPendantLink = computed(() => this.mpgModules().length > 0);
  pendantLink = computed(() => {
    const firstMpg = this.mpgModules()[0];
    if (!firstMpg) {
      return '/'; // Fallback, though it won't be shown
    }
    return firstMpg.protocol === 'LinuxCNC API' ? '/linuxcnc-mpg' : '/mpg';
  });

  wifiSignalBars = computed(() => {
    const status = this.wifiStatus();
    if (status.status !== 'connected') {
      return 0;
    }
    const strength = status.signalStrength;
    if (strength > 80) return 4;
    if (strength > 55) return 3;
    if (strength > 30) return 2;
    if (strength > 0) return 1; // Even a weak signal shows the dot
    return 0;
  });

  constructor() {
    // Manually initialize the config service after all root services are created
    // to prevent circular dependency errors during instantiation.
    this.configFileService.initializeConfig();

    // Removed: Redundant WebSocket connection initiation.
    // This logic is now correctly centralized in ArduinoService.
    /*
    effect(() => {
      const port = this.arduinoService.watchdogConfig().WEBSOCKET_PORT;
      const wsUrl = `ws://localhost:${port}/ws-endpoint`;
      this.webSocketService.connect(wsUrl);
    });
    */

    // Effect for ethernet activity simulation
    effect(() => {
      if (this.connectionStatus() === 'connected') {
        this.startEthernetActivitySimulation();
      } else {
        this.stopEthernetActivitySimulation();
      }
    });

    // Reactively trigger a simulated WebSocket connect when the port configuration changes.
    effect(() => {
      const port = this.arduinoService.watchdogConfig().WEBSOCKET_PORT; // Read port to create dependency
      // Call simulateConnect explicitly here on initial load and config changes.
      // The WebSocketService itself no longer needs the URL, as it's fully simulated.
      this.webSocketService.simulateConnect(); 
    });

    // NEW: Effect for reboot overlay and navigation
    effect(() => {
      const wsStatus = this.webSocketService.connectionStatus();
      if (wsStatus === 'restarting') {
        this.showRebootOverlay.set(true);
      } else if (wsStatus === 'connected' && this.showRebootOverlay()) {
        this.showRebootOverlay.set(false);
        // Navigate back to the previous route if one was stored
        const prevUrl = this.previousRouteUrl();
        if (prevUrl) {
          this.router.navigateByUrl(prevUrl);
          this.previousRouteUrl.set(null); // Clear after use
        } else {
          // Fallback to dashboard if no previous route or if we were on the dashboard
          this.router.navigate(['/dashboard']);
        }
      }
    });

    // Removed the LinuxCNC connection simulation from AppComponent.
    // This logic is now centralized within the ArduinoService.
  }

  ngOnDestroy(): void {
    this.stopEthernetActivitySimulation();
  }

  private startEthernetActivitySimulation(): void {
    if (this.activityInterval) { return; }
    this.activityInterval = setInterval(() => {
      // 40% chance to blink
      if (Math.random() > 0.6) {
        this.ethernetActivity.set(true);
        // Random blink duration
        setTimeout(() => this.ethernetActivity.set(false), 100 + Math.random() * 50);
      }
    }, 300); // Check every 300ms
  }

  private stopEthernetActivitySimulation(): void {
    if (this.activityInterval) {
      clearInterval(this.activityInterval);
      this.activityInterval = null;
    }
    this.ethernetActivity.set(false);
  }

  rebootDevice(): void {
    this.showRebootConfirmation.set(true);
  }

  handleRebootConfirm(): void {
    this.previousRouteUrl.set(this.router.url); // Store current route
    this.arduinoService.rebootDevice();
    this.showRebootConfirmation.set(false);
    this.showRebootOverlay.set(true); // Activate overlay immediately
  }

  handleRebootCancel(): void {
    this.showRebootConfirmation.set(false);
  }
  
  getWifiSignalColorClass(): string {
    const wifiStatus = this.wifiStatus();
    const wifiMode = this.wifiConfig().MODE;

    if (wifiMode === 'AP') {
      return 'text-blue-400'; // Distinct color for AP mode
    }
    if (wifiStatus.status === 'disconnected') {
      return 'text-gray-600';
    }

    switch (this.wifiSignalBars()) {
      case 4:
      case 3:
        return 'text-green-400';
      case 2:
        return 'text-yellow-400';
      case 1:
        return 'text-red-400'; // Poor signal
      default:
        return 'text-gray-600';
    }
  }

  hexToRgba(hex: string, alpha: number = 1): string {
    if (!hex || hex === 'off' || hex.length < 4) {
      return 'rgba(128, 128, 128, 0)'; // Return transparent for off state
    }
    let c: any;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');
        if (c.length === 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = '0x' + c.join('');
        return `rgba(${[(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',')},${alpha})`;
    }
    return 'rgba(128, 128, 128, 0)'; // Fallback to transparent
  }

  flashOnboardLed(): void {
    const originalState = this.onboardLed();
    // Prevent re-triggering if already flashing from a click
    if (originalState.color === '#800080' && originalState.flashing) {
      return;
    }

    this.arduinoService.updateOnboardLedState({ color: '#800080', flashing: true, brightness: 255 }); // Purple

    setTimeout(() => {
      // Only revert if the state hasn't been changed by something else
      const currentState = this.onboardLed();
      if (currentState.color === '#800080' && currentState.flashing) {
        this.arduinoService.updateOnboardLedState(originalState);
      }
    }, 3000);
  }

  toggleMobileMenu(): void {
    this.showMobileMenu.update(v => !v);
  }

  // Admin related methods
  openAccessCodeModal(): void {
    this.preLoginRouteUrl.set(this.router.url); // Store current route before opening modal
    this.showAccessCodeModal.set(true);
    this.loginError.set(null); // Clear any previous errors when opening the modal
  }

  handleLogin(code: string): void {
    // Pass the entered code to AdminService for authentication
    if (this.adminService.login(code)) {
      this.showAccessCodeModal.set(false);
      this.loginError.set(null); // Clear error on success
      const prevUrl = this.preLoginRouteUrl();
      if (prevUrl) {
        this.router.navigateByUrl(prevUrl);
      } else {
        this.router.navigate(['/dashboard']); // Fallback to dashboard
      }
      this.preLoginRouteUrl.set(null); // Clear the stored URL
    } else {
      // Handle incorrect code
      this.loginError.set('Incorrect access code. Please try again.');
    }
  }

  handleLogout(): void {
    this.adminService.logout();
    this.router.navigate(['/dashboard']); // Redirect to dashboard on logout
  }
}