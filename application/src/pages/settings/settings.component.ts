import { ChangeDetectionStrategy, Component, Signal, inject, signal, computed, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, ReactiveFormsModule, FormBuilder, FormGroup, Validators, ValidatorFn } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { ArduinoService, SshConfig, SystemConfig, LedsConfig, AlexaConfig, ServosConfig, TableConfig, StorageMonitoringConfig } from '../../services/arduino.service';
import { ConfigFileService, InternetMonitoringConfig } from '../../services/config-file.service';
import { InternetConnectivityService } from '../../services/internet-connectivity.service';
import { AdminService } from '../../services/admin.service';

// Custom validator for access code matching
const matchAccessCodeValidator: ValidatorFn = (control: AbstractControl): { [key: string]: boolean } | null => {
  const accessCodeControl = control.get('ACCESS_CODE');
  const confirmAccessCodeControl = control.get('CONFIRM_ACCESS_CODE');

  if (!accessCodeControl || !confirmAccessCodeControl) {
    return null; // Controls not found
  }

  const accessCode = accessCodeControl.value;
  const confirmAccessCode = confirmAccessCodeControl.value;

  // Case 1: Both are empty, implies removing the code. Valid.
  if ((!accessCode || accessCode.length === 0) && (!confirmAccessCode || confirmAccessCode.length === 0)) {
    // Clear any previous mismatch errors on the confirm field
    if (confirmAccessCodeControl.hasError('mismatch')) {
      const { mismatch, ...otherErrors } = confirmAccessCodeControl.errors || {};
      confirmAccessCodeControl.setErrors(Object.keys(otherErrors).length > 0 ? otherErrors : null);
    }
    return null;
  }

  // Case 2: Access code exists, and confirmation does not match or is empty
  // OR Case 3: Access code is empty, but confirmation has a value.
  if ((accessCode && accessCode.length > 0 && accessCode !== confirmAccessCode) ||
      ((!accessCode || accessCode.length === 0) && (confirmAccessCode && confirmAccessCode.length > 0))) {
    confirmAccessCodeControl.setErrors({ 'mismatch': true });
    return { 'accessCodeMismatch': true };
  }
  
  // If we reach here, they either match (and accessCode is not empty), or both are empty.
  // Ensure mismatch error is cleared if they now match.
  if (confirmAccessCodeControl.hasError('mismatch')) {
     const { mismatch, ...otherErrors } = confirmAccessCodeControl.errors || {};
     confirmAccessCodeControl.setErrors(Object.keys(otherErrors).length > 0 ? otherErrors : null);
  }

  return null;
};

@Component({
  selector: 'app-settings-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPageComponent implements OnInit, OnDestroy {
  private arduinoService = inject(ArduinoService);
  private configFileService = inject(ConfigFileService);
  private internetConnectivityService = inject(InternetConnectivityService);
  protected adminService = inject(AdminService);
  private fb: FormBuilder = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();

  buzzerEnabled: Signal<boolean> = this.arduinoService.buzzerEnabled;
  mainSettingsForm: FormGroup;

  sections = {
    ssh: signal(false),
    watchdog: signal(false),
    sdCard: signal(false),
    firmware: signal(false),
    generalSystem: signal(false),
    storage: signal(false),
    servos: signal(false),
    leds: signal(false),
    alexa: signal(false),
    internetMonitoring: signal(false),
    security: signal(false), // ADDED THIS LINE
  };

  allSectionsOpen = computed(() => {
    return Object.values(this.sections).every(s => s());
  });

  ipAddressPattern: RegExp = /^((\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.){3}(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$|^(localhost)$/;

  // NEW: Signal for save confirmation ribbon
  savedConfirmation = signal(false);

  constructor() {
    this.mainSettingsForm = this.fb.group({
      system: this.createSystemFormGroup(),
      leds: this.createLedsFormGroup(),
      alexa: this.createAlexaFormGroup(),
      servosAndTable: this.createServosAndTableFormGroup(),
      storage: this.createStorageMonitoringFormGroup(),
      internetMonitoring: this.createInternetMonitoringFormGroup(),
    });

    // Manually trigger validation on 'confirmAccessCode' when 'accessCode' changes, and vice-versa
    const systemFormGroup = this.mainSettingsForm.get('system') as FormGroup;
    systemFormGroup.get('ACCESS_CODE')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      systemFormGroup.get('CONFIRM_ACCESS_CODE')?.updateValueAndValidity();
    });
    systemFormGroup.get('CONFIRM_ACCESS_CODE')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
        // No need to explicitly trigger ACCESS_CODE, as the form group validator re-evaluates all.
        // But ensures the form group's overall validity is re-checked.
        systemFormGroup.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params.get('panel') === 'internetMonitoring') {
        this.sections.internetMonitoring.set(true);
      }
      // Handle opening the security panel if query param is present
      if (params.get('panel') === 'security') {
        this.sections.security.set(true);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createSystemFormGroup(): FormGroup {
    const sshConf = this.arduinoService.sshConfig();
    const sysConf = this.arduinoService.watchdogConfig();
    return this.fb.group({
      ENABLED: [sshConf.ENABLED],
      USERNAME: [sshConf.USERNAME, Validators.required],
      PASSWORD: [sshConf.PASSWORD, Validators.required],
      WATCHDOG: [sysConf.WATCHDOG],
      WATCHDOG_TIMEOUT: [sysConf.WATCHDOG_TIMEOUT, [Validators.required, Validators.min(1)]],
      WATCHDOG_IP: [sysConf.WATCHDOG_IP, [Validators.pattern(this.ipAddressPattern)]],
      WATCHDOG_ICMP_INTERVAL: [sysConf.WATCHDOG_ICMP_INTERVAL, [Validators.required, Validators.min(1)]],
      WATCHDOG_ICMP_FAIL_COUNT: [sysConf.WATCHDOG_ICMP_FAIL_COUNT, [Validators.required, Validators.min(1)]],
      WATCHDOG_ICMP_DELAY: [sysConf.WATCHDOG_ICMP_DELAY, [Validators.required, Validators.min(0)]],
      VOLTAGE_MONITORING_PIN: [sysConf.VOLTAGE_MONITORING_PIN, [Validators.required, Validators.min(0)]],
      FAILURE_SD_REBOOT: [sysConf.FAILURE_SD_REBOOT],
      FAILURE_SD_REBOOT_TIMEOUT: [sysConf.FAILURE_SD_REBOOT_TIMEOUT, [Validators.required, Validators.min(1)]],
      PIN_SHUTDOWN: [sysConf.PIN_SHUTDOWN, [Validators.required, Validators.min(0)]],
      WEBSOCKET_PORT: [sysConf.WEBSOCKET_PORT, [Validators.required, Validators.min(1), Validators.max(65535)]],
      FIRMWARE: [sysConf.FIRMWARE],
      FIRMWARE_TIME: [sysConf.FIRMWARE_TIME, [Validators.required, Validators.min(0)]],
      ACCESS_CODE: [sysConf.ACCESS_CODE, Validators.minLength(0)],
      CONFIRM_ACCESS_CODE: [''], // NEW: Confirmation field
    }, { validators: matchAccessCodeValidator }); // Apply the custom validator to the form group
  }

  private createLedsFormGroup(): FormGroup {
    const ledsConf = this.arduinoService.ledsConfig();
    return this.fb.group({
      COUNT_X: [ledsConf.COUNT_X, [Validators.required, Validators.min(0)]],
      COUNT_Y: [ledsConf.COUNT_Y, [Validators.required, Validators.min(0)]],
      COUNT_YY: [ledsConf.COUNT_YY, [Validators.required, Validators.min(0)]],
      DEFAULT_BRIGHTNESS_X: [ledsConf.DEFAULT_BRIGHTNESS_X, [Validators.required, Validators.min(0), Validators.max(255)]],
      DEFAULT_BRIGHTNESS_Y: [ledsConf.DEFAULT_BRIGHTNESS_Y, [Validators.required, Validators.min(0), Validators.max(255)]],
      DEFAULT_BRIGHTNESS_YY: [ledsConf.DEFAULT_BRIGHTNESS_YY, [Validators.required, Validators.min(0), Validators.max(255)]],
      AXIS_POSITION_DISPLAY: [ledsConf.AXIS_POSITION_DISPLAY, [Validators.required, Validators.min(0)]],
      IDLE_SERVO_SECONDS: [ledsConf.IDLE_SERVO_SECONDS, [Validators.required, Validators.min(0)]],
      IDLE_SERVO_DIM: [ledsConf.IDLE_SERVO_DIM, [Validators.required, Validators.min(0), Validators.max(100)]],
      LED_CHASE: [ledsConf.LED_CHASE],
      LED_CHASE_TIMEOUT: [ledsConf.LED_CHASE_TIMEOUT, [Validators.required, Validators.min(1)]],
    });
  }

  private createAlexaFormGroup(): FormGroup {
    const alexaConf = this.arduinoService.alexaConfig();
    return this.fb.group({
      ENABLED: [alexaConf.ENABLED],
      ANNOUNCE_DEVICE: [alexaConf.ANNOUNCE_DEVICE, Validators.required],
      ONBOARD_LED_DEVICE: [alexaConf.ONBOARD_LED_DEVICE, Validators.required],
      SYSTEM_BUZZER_DEVICE: [alexaConf.SYSTEM_BUZZER_DEVICE, Validators.required],
      LEDX_BRIGHTNESS_DEVICE: [alexaConf.LEDX_BRIGHTNESS_DEVICE, Validators.required],
      LEDY_BRIGHTNESS_DEVICE: [alexaConf.LEDY_BRIGHTNESS_DEVICE, Validators.required],
      LEDYY_BRIGHTNESS_DEVICE: [alexaConf.LEDYY_BRIGHTNESS_DEVICE, Validators.required],
      SHUTDOWN_DEVICE: [alexaConf.SHUTDOWN_DEVICE, Validators.required],
      CHASE_EFFECT_DEVICE: [alexaConf.CHASE_EFFECT_DEVICE, Validators.required],
    });
  }

  private createServosAndTableFormGroup(): FormGroup {
    const servosConf = this.arduinoService.servosConfig();
    const tableConf = this.arduinoService.tableConfig();
    return this.fb.group({
      SLAVE_ID_X: [servosConf.SLAVE_ID_X, [Validators.required, Validators.min(1)]],
      SLAVE_ID_Y: [servosConf.SLAVE_ID_Y, [Validators.required, Validators.min(1)]],
      SLAVE_ID_YY: [servosConf.SLAVE_ID_YY, [Validators.required, Validators.min(1)]],
      RAIL_X: [tableConf.RAIL_X, [Validators.required, Validators.min(1)]],
      RAIL_Y: [tableConf.RAIL_Y, [Validators.required, Validators.min(1)]],
    });
  }

  private createStorageMonitoringFormGroup(): FormGroup {
    const storageConf = this.arduinoService.storageMonitoringConfig();
    return this.fb.group({
      SD_CARD_THRESHOLD: [storageConf.SD_CARD_THRESHOLD, [Validators.required, Validators.min(1), Validators.max(100)]],
      LOCAL_STORAGE_THRESHOLD: [storageConf.LOCAL_STORAGE_THRESHOLD, [Validators.required, Validators.min(1), Validators.max(100)]],
      SRAM_THRESHOLD: [storageConf.SRAM_THRESHOLD, [Validators.required, Validators.min(1), Validators.max(100)]],
      EEPROM_THRESHOLD: [storageConf.EEPROM_THRESHOLD, [Validators.required, Validators.min(1), Validators.max(100)]],
    });
  }

  private createInternetMonitoringFormGroup(): FormGroup {
    const pingEnabled = this.internetConnectivityService.pingEnabled();
    const pingTarget = this.internetConnectivityService.pingTarget();
    
    const formGroup = this.fb.group({
      PING_ENABLED: [pingEnabled],
      PING_TARGET: [
        pingTarget,
        {
          validators: [Validators.pattern(this.ipAddressPattern)], // Always validate format
          disabled: !pingEnabled, // Initialize disabled state based on PING_ENABLED
        }
      ],
    });

    // Conditionally apply Validators.required and enable/disable `PING_TARGET`
    formGroup.get('PING_ENABLED')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((enabled: boolean) => {
        const pingTargetControl = formGroup.get('PING_TARGET');
        if (pingTargetControl) {
          if (enabled) {
            pingTargetControl.addValidators(Validators.required);
            pingTargetControl.enable(); // Explicitly enable the control
          } else {
            pingTargetControl.removeValidators(Validators.required);
            pingTargetControl.disable(); // Explicitly disable the control
          }
          pingTargetControl.updateValueAndValidity(); // Re-run validation
        }
      });
    
    // Initial validation check based on initial PING_ENABLED value
    const initialPingEnabled = formGroup.get('PING_ENABLED')?.value;
    if (initialPingEnabled) {
      formGroup.get('PING_TARGET')?.addValidators(Validators.required);
    }
    formGroup.get('PING_TARGET')?.updateValueAndValidity();

    return formGroup;
  }

  toggleBuzzer(): void {
    this.arduinoService.toggleBuzzer();
  }

  saveAllSettings(): void {
    this.mainSettingsForm.markAllAsTouched(); // Mark all controls as touched to trigger validation UI

    if (this.mainSettingsForm.invalid) {
      // Logic to expand panels containing invalid controls
      const formGroupsMapping: { [key: string]: (keyof typeof this.sections)[] } = {
        system: ['ssh', 'watchdog', 'sdCard', 'firmware', 'generalSystem', 'security'],
        leds: ['leds'],
        alexa: ['alexa'],
        servosAndTable: ['servos'],
        storage: ['storage'],
        internetMonitoring: ['internetMonitoring'],
      };

      for (const formGroupName of Object.keys(formGroupsMapping)) {
        const formGroup = this.mainSettingsForm.get(formGroupName) as FormGroup;
        if (formGroup && formGroup.invalid) {
          // Open the main associated section
          formGroupsMapping[formGroupName].forEach(sectionKey => {
            if (this.sections[sectionKey]) {
              this.sections[sectionKey].set(true);
            }
          });

          // Special handling for the 'system' form group because it maps to multiple UI panels
          if (formGroupName === 'system') {
            const systemFormGroup = this.mainSettingsForm.get('system') as FormGroup;

            // Check SSH sub-section controls
            if (this.hasInvalidControl(systemFormGroup, ['ENABLED', 'USERNAME', 'PASSWORD'])) {
              this.sections.ssh.set(true);
            }
            // Check Watchdog sub-section controls
            if (this.hasInvalidControl(systemFormGroup, ['WATCHDOG', 'WATCHDOG_TIMEOUT', 'WATCHDOG_IP', 'WATCHDOG_ICMP_INTERVAL', 'WATCHDOG_ICMP_FAIL_COUNT', 'WATCHDOG_ICMP_DELAY'])) {
              this.sections.watchdog.set(true);
             }
             // Check SD Card sub-section controls
            if (this.hasInvalidControl(systemFormGroup, ['FAILURE_SD_REBOOT', 'FAILURE_SD_REBOOT_TIMEOUT'])) {
              this.sections.sdCard.set(true);
            }
            // Check Firmware sub-section controls
            if (this.hasInvalidControl(systemFormGroup, ['FIRMWARE', 'FIRMWARE_TIME'])) {
              this.sections.firmware.set(true);
            }
            // Check General System sub-section controls, including ACCESS_CODE
            if (this.hasInvalidControl(systemFormGroup, ['VOLTAGE_MONITORING_PIN', 'PIN_SHUTDOWN', 'WEBSOCKET_PORT', 'ACCESS_CODE', 'CONFIRM_ACCESS_CODE'])) {
              this.sections.generalSystem.set(true);
              this.sections.security.set(true); // Ensure security is open if its related control is invalid
            }
          }
        }
      }
      // Stop execution if form is invalid, preventing save operation
      return;
    }
    
    if (this.mainSettingsForm.dirty) {
      const formValue = this.mainSettingsForm.getRawValue();

      // System & SSH
      const systemValue = formValue.system;
      const sshConfig: SshConfig = {
        ENABLED: systemValue.ENABLED,
        USERNAME: systemValue.USERNAME,
        PASSWORD: systemValue.PASSWORD
      };
      const systemConfig: SystemConfig = { ...systemValue };
      // These properties are part of SystemConfig in the form but need to be removed before passing to ConfigFileService
      // because they are now directly set in SshConfig (which ConfigFileService updates separately).
      // However, since SystemConfig is now fully typed and matches the form, this deletion is not strictly needed.
      // But it's good practice to ensure SystemConfig only contains what it's supposed to.
      delete (systemConfig as any).ENABLED; // Handled by sshConfig
      delete (systemConfig as any).USERNAME; // Handled by sshConfig
      delete (systemConfig as any).PASSWORD; // Handled by sshConfig
      delete (systemConfig as any).CONFIRM_ACCESS_CODE; // NEW: Not part of actual config

      this.configFileService.updateSystemAndSshConfig(systemConfig, sshConfig);

      // Other sections
      this.configFileService.updateLedsConfig(formValue.leds);
      this.configFileService.updateAlexaConfig(formValue.alexa);
      
      const servosAndTableValue = formValue.servosAndTable;
      const servosConfig: ServosConfig = {
        SLAVE_ID_X: servosAndTableValue.SLAVE_ID_X,
        SLAVE_ID_Y: servosAndTableValue.SLAVE_ID_Y,
        SLAVE_ID_YY: servosAndTableValue.SLAVE_ID_YY,
      };
      const tableConfig: TableConfig = {
        RAIL_X: servosAndTableValue.RAIL_X,
        RAIL_Y: servosAndTableValue.RAIL_Y,
      };
      this.configFileService.updateServosAndTableConfig(servosConfig, tableConfig);

      this.configFileService.updateStorageMonitoringConfig(formValue.storage);

      // NEW: Internet Monitoring
      const internetMonitoringConfig: InternetMonitoringConfig = formValue.internetMonitoring;
      this.configFileService.updateInternetMonitoringConfig(internetMonitoringConfig);

      // If the access code was changed, force a logout
      if (this.adminService.getCurrentSecurityCode() !== systemValue.ACCESS_CODE) {
        this.adminService.logout();
      }

      this.mainSettingsForm.markAsPristine();
      
      // NEW: Show confirmation ribbon
      this.savedConfirmation.set(true);
      setTimeout(() => this.savedConfirmation.set(false), 3000);
    }
  }

  resetAllSettings(): void {
    // Re-patch all values from the ArduinoService and InternetConnectivityService
    // which holds the *current active* configuration (after ConfigFileService loads defaults/persisted).
    const sysConf = this.arduinoService.watchdogConfig();
    const sshConf = this.arduinoService.sshConfig();
    const netConf = this.arduinoService.networkConfig(); // Not used directly in this form, but good for completeness if it were.
    const wifiConf = this.arduinoService.wifiConfig(); // Not used directly in this form, but good for completeness if it were.
    
    this.mainSettingsForm.reset({
      system: {
        ...sysConf, // This now includes ACCESS_CODE
        ...sshConf,
        CONFIRM_ACCESS_CODE: '', // NEW: Reset confirm field
      },
      leds: this.arduinoService.ledsConfig(),
      alexa: this.arduinoService.alexaConfig(),
      servosAndTable: {
        ...this.arduinoService.servosConfig(),
        ...this.arduinoService.tableConfig()
      },
      storage: this.arduinoService.storageMonitoringConfig(),
      internetMonitoring: {
        PING_ENABLED: this.internetConnectivityService.pingEnabled(),
        PING_TARGET: this.internetConnectivityService.pingTarget(),
      },
    });
    // After resetting the form, explicitly re-run the logic that enables/disables the PING_TARGET
    // to ensure its disabled state is correctly applied.
    const internetMonitoringGroup = this.mainSettingsForm.get('internetMonitoring') as FormGroup;
    const pingEnabledControl = internetMonitoringGroup.get('PING_ENABLED');
    if (pingEnabledControl) {
        // Trigger the valueChanges subscription manually
        pingEnabledControl.setValue(pingEnabledControl.value, { emitEvent: true });
    }
    this.mainSettingsForm.markAsPristine(); // Ensure the form is pristine after reset
  }

  toggleAllSections(): void {
    const shouldOpen = !this.allSectionsOpen();
    for (const section of Object.values(this.sections)) {
      section.set(shouldOpen);
    }
  }

  toggleSection(sectionKey: keyof typeof this.sections): void {
    const wasOpen = this.sections[sectionKey]();
    // Close all other sections
    for (const key in this.sections) {
      if (key !== sectionKey && this.sections.hasOwnProperty(key)) {
        this.sections[key as keyof typeof this.sections].set(false);
      }
    }
    // Toggle the clicked section
    this.sections[sectionKey].set(!wasOpen);
  }

  simulateSdWriteFailure(): void {
    this.arduinoService.simulateSdWriteFailure();
  }

  /**
   * Helper function to check if any of a list of controls are invalid and touched.
   */
  private hasInvalidControl(formGroup: FormGroup, controlNames: string[]): boolean {
    for (const name of controlNames) {
      const control = formGroup.get(name);
      if (control && control.invalid && control.touched) {
        return true;
      }
    }
    return false;
  }
}