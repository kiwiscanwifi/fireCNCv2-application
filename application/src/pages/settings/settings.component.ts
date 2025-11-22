import { ChangeDetectionStrategy, Component, Signal, inject, signal, computed, OnInit, OnDestroy, AfterViewInit, WritableSignal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, ReactiveFormsModule, FormBuilder, FormGroup, Validators, ValidatorFn, FormArray, ValidationErrors } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// FIX: Correctly import SshConfig and other types.
import { ArduinoService, SystemConfig, LedsConfig, AlexaConfig, ServosConfig, TableConfig, StorageMonitoringConfig, SshConfig } from '../../services/arduino.service';
// FIX: Correctly import InternetMonitoringConfig and remove unused RemoteConfigSettings.
import { ConfigFileService, InternetMonitoringConfig } from '../../services/config-file.service';
import { ConfigManagementService } from '../../services/config-management.service';
import { InternetConnectivityService } from '../../services/internet-connectivity.service';
import { AdminService } from '../../services/admin.service';
import { NotificationService } from '../../services/notification.service'; // NEW
import { AlexaService } from '../../services/alexa.service';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

// Custom validator to check if access codes match or if confirm is blank when access is blank
export const accessCodeMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const accessCodeControl = control.get('ACCESS_CODE');
  const confirmAccessCodeControl = control.get('CONFIRM_ACCESS_CODE');

  if (!accessCodeControl || !confirmAccessCodeControl) {
    return null; // Should not happen if controls are properly initialized
  }

  const accessCode = accessCodeControl.value as string;
  const confirmAccessCode = confirmAccessCodeControl.value as string;

  // Rule 1: If accessCode has a value, confirmAccessCode must match
  if (accessCode.length > 0 && accessCode !== confirmAccessCode) {
    return { accessCodeMismatch: true };
  }

  // Rule 2: If accessCode is empty, confirmAccessCode must also be empty
  if (accessCode.length === 0 && confirmAccessCode.length > 0) {
    return { confirmMustBeBlank: true };
  }

  return null; // Validation passed
};

@Component({
  selector: 'app-settings-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
  ],
  templateUrl: './settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPageComponent implements OnInit, OnDestroy {
  protected arduinoService = inject(ArduinoService);
  private configFileService = inject(ConfigFileService);
  private configManagementService = inject(ConfigManagementService);
  private internetConnectivityService = inject(InternetConnectivityService);
  protected adminService = inject(AdminService);
  private fb: FormBuilder = inject(FormBuilder);
  // FIX: Inject `ActivatedRoute` instead of `Router`, which was not imported and was the incorrect type for this property.
  private route: ActivatedRoute = inject(ActivatedRoute);
  private notificationService = inject(NotificationService); // NEW
  private alexaService = inject(AlexaService);
  protected languageService = inject(LanguageService);
  private destroy$ = new Subject<void>();
  
  urlPattern = /^(https?:\/\/[^\s$.?#].[^\s]*)$/;

  buzzerEnabled: Signal<boolean> = this.arduinoService.buzzerEnabled;
  mainSettingsForm: FormGroup;

  // Expose Alexa config for announcement settings
  protected alexaConfig: Signal<AlexaConfig> = this.arduinoService.alexaConfig;

  sections = {
    remoteConfig: signal(false),
    ssh: signal(false),
    watchdog: signal(false),
    sdCard: signal(false),
    software: signal(false),
    generalSystem: signal(false),
    esp32: signal(false),
    security: signal(false),
    internetMonitoring: signal(false),
    storage: signal(false),
    servo: signal(false),
    table: signal(false),
    leds: signal(false),
    alexa: signal(false),
    language: signal(false),
    rs485: signal(false), // Reinstating a section for RS485 settings
  };

  allSectionsOpen = computed(() => {
    return Object.values(this.sections).every(s => s());
  });

  constructor() {
    this.mainSettingsForm = this.fb.group({
      remote: this.createRemoteConfigFormGroup(),
      ssh: this.createSshFormGroup(),
      system: this.createSystemFormGroup(),
      leds: this.createLedsFormGroup(),
      alexa: this.createAlexaFormGroup(),
      servos: this.createServosFormGroup(),
      table: this.createTableFormGroup(),
      storage: this.createStorageMonitoringFormGroup(),
      internetMonitoring: this.createInternetMonitoringFormGroup(),
    });

    this.mainSettingsForm.markAsPristine();

    effect(() => {
      const isAdmin = this.adminService.isAdminMode();
      const systemFormGroup = this.mainSettingsForm.get('system') as FormGroup;
      const accessCodeControl = systemFormGroup.get('ACCESS_CODE');
      const confirmAccessCodeControl = systemFormGroup.get('CONFIRM_ACCESS_CODE');

      if (accessCodeControl && confirmAccessCodeControl) {
        if (isAdmin) {
          accessCodeControl.enable({ emitEvent: false });
          confirmAccessCodeControl.enable({ emitEvent: false });
        } else {
          accessCodeControl.disable({ emitEvent: false });
          confirmAccessCodeControl.disable({ emitEvent: false });
          accessCodeControl.setValue('', { emitEvent: false });
          confirmAccessCodeControl.setValue('', { emitEvent: false });
          accessCodeControl.setErrors(null, { emitEvent: false });
          confirmAccessCodeControl.setErrors(null, { emitEvent: false });
          accessCodeControl.markAsPristine({ emitEvent: false });
          confirmAccessCodeControl.markAsPristine({ emitEvent: false });
        }
      }
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const panel = params.get('panel');
      if (panel === 'internetMonitoring') this.sections.internetMonitoring.set(true);
      if (panel === 'security') this.sections.security.set(true);
      if (panel === 'esp32') this.sections.esp32.set(true);
      if (panel === 'remoteConfig') this.sections.remoteConfig.set(true);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createRemoteConfigFormGroup(): FormGroup {
    const form = this.fb.group({
      ENABLED: [this.configFileService.remoteConfigEnabled()],
      URL: [this.configFileService.remoteConfigUrl(), [Validators.pattern(this.urlPattern)]]
    });

    form.get('ENABLED')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(enabled => {
      const urlControl = form.get('URL');
      if (urlControl) {
        if (enabled) {
          urlControl.setValidators([Validators.required, Validators.pattern(this.urlPattern)]);
        } else {
          urlControl.setValidators([Validators.pattern(this.urlPattern)]);
        }
        urlControl.updateValueAndValidity();
      }
    });
    // Initial validation setup
    if (form.get('ENABLED')?.value) {
      form.get('URL')?.setValidators([Validators.required, Validators.pattern(this.urlPattern)]);
    }

    return form;
  }
  
  private createSshFormGroup(): FormGroup {
    const sshConf = this.arduinoService.sshConfig();
    return this.fb.group({
      ENABLED: [sshConf.ENABLED],
      PASSWORD: [''],
    });
  }

  private createSystemFormGroup(): FormGroup {
    const sysConf = this.arduinoService.watchdogConfig();
    const isAdminInitially = this.adminService.isAdminMode();

    const systemForm = this.fb.group({
      WATCHDOG: [sysConf.WATCHDOG],
      WATCHDOG_TIMEOUT: [sysConf.WATCHDOG_TIMEOUT],
      WATCHDOG_IP: [sysConf.WATCHDOG_IP],
      WATCHDOG_ICMP_INTERVAL: [sysConf.WATCHDOG_ICMP_INTERVAL],
      WATCHDOG_ICMP_FAIL_COUNT: [sysConf.WATCHDOG_ICMP_FAIL_COUNT],
      WATCHDOG_ICMP_DELAY: [sysConf.WATCHDOG_ICMP_DELAY],
      VOLTAGE_MONITORING_PIN: [sysConf.VOLTAGE_MONITORING_PIN],
      FAILURE_SD_REBOOT: [sysConf.FAILURE_SD_REBOOT],
      FAILURE_SD_REBOOT_TIMEOUT: [sysConf.FAILURE_SD_REBOOT_TIMEOUT],
      PIN_SHUTDOWN: [sysConf.PIN_SHUTDOWN],
      WEBSOCKET_URL: [sysConf.WEBSOCKET_URL, [Validators.required, Validators.pattern('^ws:\\/\\/.+')]],
      FIRMWARE: [sysConf.FIRMWARE],
      FIRMWARE_TIME: [sysConf.FIRMWARE_TIME],
      ACCESS_CODE: [{ value: '', disabled: !isAdminInitially }, [Validators.minLength(4)]],
      CONFIRM_ACCESS_CODE: [{ value: '', disabled: !isAdminInitially }],
      TEXT_SELECTION_ENABLED: [sysConf.TEXT_SELECTION_ENABLED],
      CONFIG_CHANGE_TIMEOUT: [sysConf.CONFIG_CHANGE_TIMEOUT, [Validators.required, Validators.min(30), Validators.max(300)]],
    }, { validators: accessCodeMatchValidator });

    systemForm.get('ACCESS_CODE')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        systemForm.updateValueAndValidity({ emitEvent: false });
      });

    systemForm.get('CONFIRM_ACCESS_CODE')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        systemForm.updateValueAndValidity({ emitEvent: false });
      });

    return systemForm;
  }

  private createLedsFormGroup(): FormGroup {
    const ledsConf = this.arduinoService.ledsConfig();
    return this.fb.group({
      COUNT_X: [ledsConf.COUNT_X],
      COUNT_Y: [ledsConf.COUNT_Y],
      COUNT_YY: [ledsConf.COUNT_YY],
      DEFAULT_BRIGHTNESS_X: [ledsConf.DEFAULT_BRIGHTNESS_X],
      DEFAULT_BRIGHTNESS_Y: [ledsConf.DEFAULT_BRIGHTNESS_Y],
      DEFAULT_BRIGHTNESS_YY: [ledsConf.DEFAULT_BRIGHTNESS_YY],
      AXIS_POSITION_DISPLAY: [ledsConf.AXIS_POSITION_DISPLAY],
      IDLE_SERVO_SECONDS: [ledsConf.IDLE_SERVO_SECONDS],
      IDLE_SERVO_DIM: [ledsConf.IDLE_SERVO_DIM],
      LED_CHASE: [ledsConf.LED_CHASE],
      LED_CHASE_TIMEOUT: [ledsConf.LED_CHASE_TIMEOUT],
      DYNAMIC_BRIGHTNESS_ENABLED: [ledsConf.DYNAMIC_BRIGHTNESS_ENABLED],
      MAX_POWER_CONSUMPTION: [ledsConf.MAX_POWER_CONSUMPTION, [Validators.required, Validators.min(1)]],
      POWER_WARNING_THRESHOLD: [ledsConf.POWER_WARNING_THRESHOLD, [Validators.required, Validators.min(5), Validators.max(30)]],
    });
  }

  private createAlexaFormGroup(): FormGroup {
    const alexaConf = this.arduinoService.alexaConfig();
    return this.fb.group({
      ENABLED: [alexaConf.ENABLED],
      ANNOUNCE_DEVICE: [alexaConf.ANNOUNCE_DEVICE],
      ONBOARD_LED_DEVICE: [alexaConf.ONBOARD_LED_DEVICE],
      SYSTEM_BUZZER_DEVICE: [alexaConf.SYSTEM_BUZZER_DEVICE],
      LEDX_BRIGHTNESS_DEVICE: [alexaConf.LEDX_BRIGHTNESS_DEVICE],
      LEDY_BRIGHTNESS_DEVICE: [alexaConf.LEDY_BRIGHTNESS_DEVICE],
      LEDYY_BRIGHTNESS_DEVICE: [alexaConf.LEDYY_BRIGHTNESS_DEVICE],
      SHUTDOWN_DEVICE: [alexaConf.SHUTDOWN_DEVICE],
      CHASE_EFFECT_DEVICE: [alexaConf.CHASE_EFFECT_DEVICE],
      ANNOUNCE_BANNERS_ENABLED: [alexaConf.ANNOUNCE_BANNERS_ENABLED],
      ANNOUNCEMENT_TYPES: this.fb.array(
        (alexaConf.ANNOUNCEMENT_TYPES || []).map(type => this.fb.group({
          key: [type.key],
          description: [type.description],
          enabled: [type.enabled]
        }))
      )
    });
  }

  private createServosFormGroup(): FormGroup {
    const servosConf = this.arduinoService.servosConfig();
    return this.fb.group({
      SLAVE_ID_X: [servosConf.SLAVE_ID_X],
      SLAVE_ID_Y: [servosConf.SLAVE_ID_Y],
      SLAVE_ID_YY: [servosConf.SLAVE_ID_YY],
      SLAVE_ID_Z: [servosConf.SLAVE_ID_Z],
      MODBUS_TIMEOUT: [servosConf.MODBUS_TIMEOUT, [Validators.required, Validators.min(100), Validators.max(2000)]],
    });
  }

  private createTableFormGroup(): FormGroup {
    const tableConf = this.arduinoService.tableConfig();
    return this.fb.group({
      RAIL_X: [tableConf.RAIL_X],
      RAIL_Y: [tableConf.RAIL_Y],
      RAIL_Z: [tableConf.RAIL_Z],
    });
  }

  private createStorageMonitoringFormGroup(): FormGroup {
    const storageConf = this.arduinoService.storageMonitoringConfig();
    return this.fb.group({
      SD_CARD_THRESHOLD: [storageConf.SD_CARD_THRESHOLD],
      LOCAL_STORAGE_THRESHOLD: [storageConf.LOCAL_STORAGE_THRESHOLD],
      SRAM_THRESHOLD: [storageConf.SRAM_THRESHOLD],
      EEPROM_THRESHOLD: [storageConf.EEPROM_THRESHOLD],
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
          disabled: !pingEnabled,
        }
      ],
    });

    formGroup.get('PING_ENABLED')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((enabled: boolean) => {
        const pingTargetControl = formGroup.get('PING_TARGET');
        if (pingTargetControl) {
          if (enabled) {
            pingTargetControl.enable();
          } else {
            pingTargetControl.disable();
          }
        }
      });
    
    return formGroup;
  }

  // Getter for the announcements FormArray
  get announcementTypes(): FormArray {
    return this.mainSettingsForm.get('alexa.ANNOUNCEMENT_TYPES') as FormArray;
  }

  toggleBuzzer(): void {
    this.arduinoService.toggleBuzzer();
  }

  onToggleButtonToggle(controlPath: string): void {
    const control = this.mainSettingsForm.get(controlPath);
    if (control) {
      const currentValue = control.value;
      control.setValue(!currentValue);
      control.markAsDirty();
    }
  }

  // NEW: Method to toggle a control within the announcements FormArray
  toggleAnnouncementTypeEnabled(index: number): void {
    const control = this.announcementTypes.at(index).get('enabled');
    if (control) {
      control.setValue(!control.value);
      this.mainSettingsForm.markAsDirty();
    }
  }

  async saveAllSettings(): Promise<void> {
    this.mainSettingsForm.markAllAsTouched();

    if (this.mainSettingsForm.invalid) {
      this.notificationService.showError('Settings could not be saved. Please correct the highlighted errors.');
      return;
    }

    if (!this.mainSettingsForm.dirty) {
      this.notificationService.showError('No changes detected. Form is not dirty.');
      return;
    }

    const formValue = this.mainSettingsForm.getRawValue();

    // Stage changes for each dirty section
    if (this.mainSettingsForm.get('remote')?.dirty) {
      this.configManagementService.updateRemoteConfig(formValue.remote);
    }
    if (this.mainSettingsForm.get('ssh')?.dirty) {
      const sshValue = formValue.ssh;
      const sshConfig: SshConfig = {
        ENABLED: sshValue.ENABLED,
        USERNAME: this.arduinoService.sshConfig().USERNAME,
        PASSWORD_SET: sshValue.PASSWORD ? true : this.arduinoService.sshConfig().PASSWORD_SET,
        PASSWORD: sshValue.PASSWORD
      };
      this.configManagementService.updateSshConfig(sshConfig);
    }
    if (this.mainSettingsForm.get('system')?.dirty) {
        const systemValue = formValue.system;
        const originalAccessCode = this.arduinoService.watchdogConfig().ACCESS_CODE;
        let newAccessCode: string;
        if (systemValue.ACCESS_CODE === '' && systemValue.CONFIRM_ACCESS_CODE === '') {
          newAccessCode = originalAccessCode;
        } else {
          newAccessCode = systemValue.ACCESS_CODE;
        }
        const systemConfig: SystemConfig = { 
          ...this.arduinoService.watchdogConfig(),
          ...systemValue, 
          ACCESS_CODE: newAccessCode
        };
        delete (systemConfig as any).CONFIRM_ACCESS_CODE;
        this.configManagementService.updateSystemConfig(systemConfig);
        // If code changed, log out after save
        if (this.adminService.getCurrentSecurityCode() !== newAccessCode && newAccessCode !== '') {
            setTimeout(() => this.adminService.logout(), 500);
        }
    }
    if (this.mainSettingsForm.get('leds')?.dirty) {
      this.configManagementService.updateLedsConfig(formValue.leds);
    }
    if (this.mainSettingsForm.get('alexa')?.dirty) {
      this.configManagementService.updateAlexaConfig(formValue.alexa);
    }
    if (this.mainSettingsForm.get('servos')?.dirty) {
      this.configManagementService.updateServosConfig(formValue.servos);
    }
    if (this.mainSettingsForm.get('table')?.dirty) {
      this.configManagementService.updateTableConfig(formValue.table);
    }
    if (this.mainSettingsForm.get('storage')?.dirty) {
      this.configManagementService.updateStorageMonitoringConfig(formValue.storage);
    }
    if (this.mainSettingsForm.get('internetMonitoring')?.dirty) {
      this.configManagementService.updateInternetMonitoringConfig(formValue.internetMonitoring);
    }

    // Commit all staged changes
    await this.configManagementService.commitChanges();
    this.mainSettingsForm.markAsPristine();
  }

  resetAllSettings(): void {
    this.configManagementService.discardChanges(); // Discard any pending changes
    const sshConf = this.arduinoService.sshConfig();
    const sysConf = this.arduinoService.watchdogConfig();
    const isAdminMode = this.adminService.isAdminMode();
    const alexaConf = this.arduinoService.alexaConfig();

    this.mainSettingsForm.reset({
      remote: {
        ENABLED: this.configFileService.remoteConfigEnabled(),
        URL: this.configFileService.remoteConfigUrl(),
      },
      ssh: {
        ENABLED: sshConf.ENABLED,
        PASSWORD: '',
      },
      system: {
        ...sysConf,
        ACCESS_CODE: { value: '', disabled: !isAdminMode },
        CONFIRM_ACCESS_CODE: { value: '', disabled: !isAdminMode },
      },
      leds: this.arduinoService.ledsConfig(),
      alexa: {
        ...alexaConf,
        ANNOUNCEMENT_TYPES: (alexaConf.ANNOUNCEMENT_TYPES || []).map(type => ({
          key: type.key,
          description: type.description,
          enabled: type.enabled
        }))
      },
      servos: this.arduinoService.servosConfig(),
      table: this.arduinoService.tableConfig(),
      storage: this.arduinoService.storageMonitoringConfig(),
      internetMonitoring: {
        PING_ENABLED: this.internetConnectivityService.pingEnabled(),
        PING_TARGET: this.internetConnectivityService.pingTarget(),
      },
    });

    const internetMonitoringGroup = this.mainSettingsForm.get('internetMonitoring') as FormGroup;
    const pingEnabledControl = internetMonitoringGroup.get('PING_ENABLED');
    if (pingEnabledControl) {
        pingEnabledControl.setValue(pingEnabledControl.value, { emitEvent: true });
    }
    
    const remoteGroup = this.mainSettingsForm.get('remote') as FormGroup;
    remoteGroup.get('ENABLED')?.setValue(remoteGroup.get('ENABLED')?.value, { emitEvent: true });

    this.mainSettingsForm.markAsPristine();
    this.notificationService.clearAll();
  }

  toggleAllSections(): void {
    const shouldOpen = !this.allSectionsOpen();
    for (const section of Object.values(this.sections)) {
      section.set(shouldOpen);
    }
  }

  toggleSection(sectionKey: keyof typeof this.sections): void {
    const wasOpen = this.sections[sectionKey]();
    for (const key in this.sections) {
      if (key !== sectionKey && this.sections.hasOwnProperty(key)) {
        this.sections[key as keyof typeof this.sections].set(false);
      }
    }
    this.sections[sectionKey].set(!wasOpen);
  }

  setLanguage(event: Event): void {
    const lang = (event.target as HTMLSelectElement).value;
    this.languageService.setLanguage(lang);
  }
}
