import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ArduinoService, NetworkConfig, WifiConfig } from '../../services/arduino.service';
import { ConfigManagementService } from '../../services/config-management.service';
import { SnmpConfigService, SnmpConfig } from '../../services/snmp-config.service';
import { SnmpSettingsComponent } from '../../components/snmp-settings/snmp-settings.component';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-network-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SnmpSettingsComponent
  ],
  templateUrl: './network.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NetworkPageComponent implements OnInit, OnDestroy {
  private arduinoService = inject(ArduinoService);
  private configManagementService = inject(ConfigManagementService);
  private snmpConfigService = inject(SnmpConfigService);
  private fb: FormBuilder = inject(FormBuilder);
  private notificationService = inject(NotificationService);

  networkSettingsForm: FormGroup;

  ipAddressPattern = '^((\\d{1,2}|1\\d\\d|2[0-4]\\d|25[0-5])\\.){3}(\\d{1,2}|1\\d\\d|2[0-4]\\d|25[0-5])$|^(localhost)$';

  private destroy$ = new Subject<void>();

  constructor() {
    this.networkSettingsForm = this.fb.group({
      network: this.createNetworkFormGroup(),
      snmp: this.createSnmpFormGroup()
    });
  }

  ngOnInit(): void {
    const networkGroup = this.networkSettingsForm.get('network') as FormGroup;
    const snmpGroup = this.networkSettingsForm.get('snmp') as FormGroup; // Get SNMP form group

    // React to changes in WiFi Mode
    networkGroup.get('MODE')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      // FIX: Cast 'mode' to the expected type to resolve the 'unknown' type error.
      .subscribe(mode => this.updateWifiFields(mode as ('AP' | 'Station' | 'Disabled'), networkGroup));

    // React to changes in Station IP Assignment
    networkGroup.get('IP_ASSIGNMENT')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      // FIX: Cast 'assignment' to the expected type to resolve the 'unknown' type error.
      .subscribe(assignment => this.updateStationIpAssignmentFields(assignment as ('DHCP' | 'Static'), networkGroup));

    // React to changes in AP DHCP Server Enabled
    networkGroup.get('DHCP_SERVER_ENABLED')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      // FIX: Cast 'enabled' to boolean to resolve the 'unknown' type error.
      .subscribe(enabled => this.updateDhcpFields(enabled as boolean, networkGroup));

    // NEW: React to changes in TRAPS_ENABLED to dynamically validate TRAP_TARGET
    snmpGroup.get('TRAPS_ENABLED')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      // FIX: Cast 'enabled' to boolean to resolve the 'unknown' type error.
      .subscribe(enabled => this.updateTrapTargetValidation(enabled as boolean, snmpGroup));

    // Initial update based on current form values
    this.updateWifiFields(networkGroup.get('MODE')?.value, networkGroup);
    this.updateDhcpFields(networkGroup.get('DHCP_SERVER_ENABLED')?.value, networkGroup);
    this.updateStationIpAssignmentFields(networkGroup.get('IP_ASSIGNMENT')?.value, networkGroup);
    // NEW: Trigger initial validation for TRAP_TARGET
    this.updateTrapTargetValidation(snmpGroup.get('TRAPS_ENABLED')?.value, snmpGroup);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createNetworkFormGroup(): FormGroup {
    const netConf = this.arduinoService.networkConfig();
    const wifiConf = this.arduinoService.wifiConfig();
    return this.fb.group({
      NTP_SERVER: [netConf.NTP_SERVER, [Validators.required, Validators.pattern(this.ipAddressPattern)]],
      STATIC_IP: [netConf.STATIC_IP, [Validators.required, Validators.pattern(this.ipAddressPattern)]],
      // SUBNET: [netConf.SUBNET, [Validators.required, Validators.pattern(this.ipAddressPattern)]], // REMOVED
      GATEWAY_IP: [netConf.GATEWAY_IP, [Validators.required, Validators.pattern(this.ipAddressPattern)]],
      DNS_SERVER: [netConf.DNS_SERVER, [Validators.required, Validators.pattern(this.ipAddressPattern)]],
      // New Wi-Fi Mode fields
      MODE: [wifiConf.MODE, Validators.required],
      SSID: [wifiConf.SSID],
      // FIX: Initialize password fields as empty since they are not stored in the config
      PASSWORD: [''],
      WIFI_AP_SSID: [wifiConf.WIFI_AP_SSID],
      WIFI_AP_KEY: [''],
      DHCP_SERVER_ENABLED: [netConf.DHCP_SERVER_ENABLED],
      DHCP_IP_POOL_START: [netConf.DHCP_IP_POOL_START],
      DHCP_IP_POOL_END: [netConf.DHCP_IP_POOL_END],
      AP_IP: [netConf.AP_IP], // NEW
      // AP_SUBNET: [netConf.AP_SUBNET], // REMOVED
      // NEW: Station mode IP assignment fields
      IP_ASSIGNMENT: [wifiConf.IP_ASSIGNMENT],
      WIFI_STATION_STATIC_IP: [wifiConf.STATIC_IP],
      // WIFI_STATION_STATIC_SUBNET: [wifiConf.SUBNET], // REMOVED
      WIFI_STATION_STATIC_GATEWAY: [wifiConf.GATEWAY_IP],
    });
  }

  private updateWifiFields(mode: 'AP' | 'Station' | 'Disabled', networkGroup: FormGroup): void {
    const ssidControl = networkGroup.get('SSID');
    const passwordControl = networkGroup.get('PASSWORD');
    const apSsidControl = networkGroup.get('WIFI_AP_SSID');
    const apKeyControl = networkGroup.get('WIFI_AP_KEY');
    const apIpControl = networkGroup.get('AP_IP'); // NEW
    // const apSubnetControl = networkGroup.get('AP_SUBNET'); // REMOVED
    const dhcpEnabledControl = networkGroup.get('DHCP_SERVER_ENABLED');
    const dhcpPoolStartControl = networkGroup.get('DHCP_IP_POOL_START');
    const dhcpPoolEndControl = networkGroup.get('DHCP_IP_POOL_END');
    const ipAssignmentControl = networkGroup.get('IP_ASSIGNMENT');
    const stationStaticIpControl = networkGroup.get('WIFI_STATION_STATIC_IP');
    // const stationStaticSubnetControl = networkGroup.get('WIFI_STATION_STATIC_SUBNET'); // REMOVED
    const stationStaticGatewayControl = networkGroup.get('WIFI_STATION_STATIC_GATEWAY');


    // Helper to apply validators and enable/disable controls
    const setControlState = (control: AbstractControl | null, enabled: boolean, required: boolean = false, pattern: string | null = null) => {
      if (!control) return;
      if (enabled) {
        control.enable({ emitEvent: false });
        const validators = [];
        if (required) validators.push(Validators.required);
        if (pattern) validators.push(Validators.pattern(pattern));
        control.setValidators(validators);
      } else {
        control.disable({ emitEvent: false });
        control.clearValidators();
      }
      control.updateValueAndValidity({ emitEvent: false });
    };

    // Reset all Wi-Fi related controls initially
    [
      ssidControl, passwordControl, apSsidControl, apKeyControl, apIpControl, // apSubnetControl REMOVED
      dhcpEnabledControl, dhcpPoolStartControl, dhcpPoolEndControl, ipAssignmentControl,
      stationStaticIpControl, stationStaticGatewayControl // stationStaticSubnetControl REMOVED
    ].forEach(c => setControlState(c, false)); // Disable all by default

    if (mode === 'Disabled') {
      // All Wi-Fi fields are disabled, which is already handled by initial reset
      this.updateStationIpAssignmentFields('DHCP', networkGroup); // Ensure sub-fields are disabled
      this.updateDhcpFields(false, networkGroup); // Ensure AP DHCP sub-fields are disabled
    } else if (mode === 'Station') {
      setControlState(ssidControl, true, true);
      setControlState(passwordControl, true, true);
      setControlState(ipAssignmentControl, true, true);

      // Trigger IP Assignment logic for station mode
      this.updateStationIpAssignmentFields(ipAssignmentControl?.value, networkGroup);

      // Disable AP specific and DHCP server fields
      this.updateDhcpFields(false, networkGroup); // Ensure AP DHCP sub-fields are disabled
    } else { // AP Mode
      setControlState(apSsidControl, true, true);
      setControlState(apKeyControl, true, true);
      setControlState(apIpControl, true, true, this.ipAddressPattern); // NEW
      // setControlState(apSubnetControl, true, true, this.ipAddressPattern); // REMOVED
      setControlState(dhcpEnabledControl, true); // DHCP server toggle required, but not always 'on'

      // Trigger DHCP fields logic for AP mode
      this.updateDhcpFields(dhcpEnabledControl?.value, networkGroup);

      // Disable Station specific IP assignment and related fields
      this.updateStationIpAssignmentFields('DHCP', networkGroup); // Ensure sub-fields are disabled
    }
  }

  private updateStationIpAssignmentFields(assignment: 'DHCP' | 'Static', networkGroup: FormGroup): void {
    const stationStaticIpControl = networkGroup.get('WIFI_STATION_STATIC_IP');
    // const stationStaticSubnetControl = networkGroup.get('WIFI_STATION_STATIC_SUBNET'); // REMOVED
    const stationStaticGatewayControl = networkGroup.get('WIFI_STATION_STATIC_GATEWAY');

    const isStationMode = networkGroup.get('MODE')?.value === 'Station';

    // Helper to apply validators and enable/disable controls
    const setControlState = (control: AbstractControl | null, enabled: boolean, required: boolean = false, pattern: string | null = null) => {
      if (!control) return;
      if (enabled) {
        control.enable({ emitEvent: false });
        const validators = [];
        if (required) validators.push(Validators.required);
        if (pattern) validators.push(Validators.pattern(pattern));
        control.setValidators(validators);
      } else {
        control.disable({ emitEvent: false });
        control.clearValidators();
      }
      control.updateValueAndValidity({ emitEvent: false });
    };

    // Only apply logic if in Station mode, otherwise ensure static fields are disabled
    if (isStationMode && assignment === 'Static') {
      setControlState(stationStaticIpControl, true, true, this.ipAddressPattern);
      // setControlState(stationStaticSubnetControl, true, true, this.ipAddressPattern); // REMOVED
      setControlState(stationStaticGatewayControl, true, true, this.ipAddressPattern);
    } else {
      setControlState(stationStaticIpControl, false);
      // setControlState(stationStaticSubnetControl, false); // REMOVED
      setControlState(stationStaticGatewayControl, false);
    }
  }


  private updateDhcpFields(enabled: boolean, networkGroup: FormGroup): void {
      const dhcpPoolStartControl = networkGroup.get('DHCP_IP_POOL_START');
      const dhcpPoolEndControl = networkGroup.get('DHCP_IP_POOL_END');
      const isAPMode = networkGroup.get('MODE')?.value === 'AP';

      const setControlState = (control: AbstractControl | null, enabled: boolean, required: boolean = false, pattern: string | null = null) => {
        if (!control) return;
        if (enabled) {
          control.enable({ emitEvent: false });
          const validators = [];
          if (required) validators.push(Validators.required);
          if (pattern) validators.push(Validators.pattern(pattern));
          control.setValidators(validators);
        } else {
          control.disable({ emitEvent: false });
          control.clearValidators();
        }
        control.updateValueAndValidity({ emitEvent: false });
      };

      if (isAPMode && enabled) {
          setControlState(dhcpPoolStartControl, true, true, this.ipAddressPattern);
          setControlState(dhcpPoolEndControl, true, true, this.ipAddressPattern);
      } else {
          setControlState(dhcpPoolStartControl, false);
          setControlState(dhcpPoolEndControl, false);
      }
  }

  private createSnmpFormGroup(): FormGroup {
    const snmpConf = this.snmpConfigService.config();
    return this.fb.group({
      AGENT_ENABLED: [snmpConf.AGENT_ENABLED],
      COMMUNITY: [snmpConf.COMMUNITY, [Validators.required]],
      PORT: [snmpConf.PORT, [Validators.required, Validators.min(1), Validators.max(65535)]],
      PROTOCOL: [snmpConf.PROTOCOL, [Validators.required]],
      TRAPS_ENABLED: [snmpConf.TRAPS_ENABLED],
      // NEW: TRAP_TARGET now only has pattern validator initially. Required is added dynamically.
      TRAP_TARGET: [snmpConf.TRAP_TARGET, [Validators.pattern(this.ipAddressPattern)]],
      TRAP_PORT: [snmpConf.TRAP_PORT, [Validators.required, Validators.min(1), Validators.max(65535)]],
      TRAP_COMMUNITY: [snmpConf.TRAP_COMMUNITY, [Validators.required]],
      TRAP_PROTOCOL: [snmpConf.TRAP_PROTOCOL, [Validators.required]],
      TRAP_LEVEL: [snmpConf.TRAP_LEVEL, [Validators.required]],
      DISPLAY_OID_ON_STATUS_PAGE: [snmpConf.DISPLAY_OID_ON_STATUS_PAGE],
    });
  }

  // NEW: Method to dynamically update TRAP_TARGET validation
  private updateTrapTargetValidation(trapsEnabled: boolean, snmpGroup: FormGroup): void {
    const trapTargetControl = snmpGroup.get('TRAP_TARGET');
    if (!trapTargetControl) return;

    if (trapsEnabled) {
      trapTargetControl.setValidators([Validators.required, Validators.pattern(this.ipAddressPattern)]);
      trapTargetControl.enable({ emitEvent: false });
    } else {
      // When traps are disabled, clear required validator and disable the control
      trapTargetControl.setValidators([Validators.pattern(this.ipAddressPattern)]); // Keep pattern to allow valid non-required inputs
      trapTargetControl.disable({ emitEvent: false }); // Disable the control
    }
    trapTargetControl.updateValueAndValidity({ emitEvent: false });
  }

  async saveNetworkSettings(): Promise<void> {
    this.networkSettingsForm.markAllAsTouched();

    if (this.networkSettingsForm.invalid) {
      this.notificationService.showError('Network settings could not be saved. Please correct errors.');
      return;
    }
    
    if (this.networkSettingsForm.dirty) {
      const formValue = this.networkSettingsForm.getRawValue();

      if (this.networkSettingsForm.get('network')?.dirty) {
        const networkValue = formValue.network;
        const wifiConfig: WifiConfig = {
          MODE: networkValue.MODE,
          SSID: networkValue.SSID,
          PASSWORD_SET: !!networkValue.PASSWORD,
          WIFI_AP_SSID: networkValue.WIFI_AP_SSID,
          WIFI_AP_KEY_SET: !!networkValue.WIFI_AP_KEY,
          IP_ASSIGNMENT: networkValue.IP_ASSIGNMENT,
          STATIC_IP: networkValue.WIFI_STATION_STATIC_IP,
          SUBNET: '255.255.255.0',
          GATEWAY_IP: networkValue.WIFI_STATION_STATIC_GATEWAY,
        };
        const networkConfig: NetworkConfig = {
          NTP_SERVER: networkValue.NTP_SERVER,
          STATIC_IP: networkValue.STATIC_IP,
          SUBNET: '255.255.255.0',
          GATEWAY_IP: networkValue.GATEWAY_IP,
          DNS_SERVER: networkValue.DNS_SERVER,
          DHCP_SERVER_ENABLED: networkValue.DHCP_SERVER_ENABLED,
          DHCP_IP_POOL_START: networkValue.DHCP_IP_POOL_START,
          DHCP_IP_POOL_END: networkValue.DHCP_IP_POOL_END,
          AP_IP: networkValue.AP_IP,
          AP_SUBNET: '255.255.255.0',
        };
        this.configManagementService.updateNetworkConfig(networkConfig);
        this.configManagementService.updateWifiConfig(wifiConfig);
      }

      if (this.networkSettingsForm.get('snmp')?.dirty) {
        const snmpConfig: SnmpConfig = formValue.snmp;
        this.configManagementService.updateSnmpConfig(snmpConfig);
      }
      
      await this.configManagementService.commitChanges();
      this.networkSettingsForm.markAsPristine();
    }
  }

  resetNetworkSettings(): void {
    this.configManagementService.discardChanges(); // Discard pending changes
    const netConf = this.arduinoService.networkConfig();
    const wifiConf = this.arduinoService.wifiConfig();
    const snmpConf = this.snmpConfigService.config();

    this.networkSettingsForm.reset({
      network: {
        NTP_SERVER: netConf.NTP_SERVER,
        STATIC_IP: netConf.STATIC_IP,
        GATEWAY_IP: netConf.GATEWAY_IP,
        DNS_SERVER: netConf.DNS_SERVER,
        MODE: wifiConf.MODE,
        SSID: wifiConf.SSID,
        PASSWORD: '',
        WIFI_AP_SSID: wifiConf.WIFI_AP_SSID,
        WIFI_AP_KEY: '',
        AP_IP: netConf.AP_IP,
        DHCP_SERVER_ENABLED: netConf.DHCP_SERVER_ENABLED,
        DHCP_IP_POOL_START: netConf.DHCP_IP_POOL_START,
        DHCP_IP_POOL_END: netConf.DHCP_IP_POOL_END,
        IP_ASSIGNMENT: wifiConf.IP_ASSIGNMENT,
        WIFI_STATION_STATIC_IP: wifiConf.STATIC_IP,
        WIFI_STATION_STATIC_GATEWAY: wifiConf.GATEWAY_IP,
      },
      snmp: snmpConf
    });
    // Re-trigger valueChanges to correctly apply enable/disable states and validators
    const networkGroup = this.networkSettingsForm.get('network') as FormGroup;
    networkGroup.get('MODE')?.setValue(networkGroup.get('MODE')?.value, { emitEvent: true });
    networkGroup.get('DHCP_SERVER_ENABLED')?.setValue(networkGroup.get('DHCP_SERVER_ENABLED')?.value, { emitEvent: true });
    networkGroup.get('IP_ASSIGNMENT')?.setValue(networkGroup.get('IP_ASSIGNMENT')?.value, { emitEvent: true });
    
    const snmpGroup = this.networkSettingsForm.get('snmp') as FormGroup;
    snmpGroup.get('TRAPS_ENABLED')?.setValue(snmpGroup.get('TRAPS_ENABLED')?.value, { emitEvent: true });
  }
}
