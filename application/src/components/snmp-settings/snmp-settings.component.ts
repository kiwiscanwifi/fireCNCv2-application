/**
 * @file src/components/snmp-settings/snmp-settings.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for managing SNMP configuration. Displays settings and allows for sending
 * test traps and configuring the trap level.
 */
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, ControlContainer } from '@angular/forms';
import { SnmpConfigService, SnmpProtocol } from '../../services/snmp-config.service';
import { LogLevel } from '../../services/system-log.service';

@Component({
  selector: 'app-snmp-settings',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './snmp-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SnmpSettingsComponent implements OnInit {
  private snmpConfigService = inject(SnmpConfigService);
  private controlContainer = inject(ControlContainer);
  
  logLevels: LogLevel[] = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
  protocols: SnmpProtocol[] = ['UDP', 'TCP'];
  snmpForm!: FormGroup;

  constructor() {}

  ngOnInit(): void {
    this.snmpForm = this.controlContainer.control as FormGroup;
    
    // Set up listeners to enable/disable fields reactively based on toggles
    this.snmpForm.get('AGENT_ENABLED')?.valueChanges.subscribe(() => this.updateControlStates());
    this.snmpForm.get('TRAPS_ENABLED')?.valueChanges.subscribe(() => this.updateControlStates());
    this.updateControlStates();
  }

  toggleAgentAndUpdate(): void {
    const control = this.snmpForm.get('AGENT_ENABLED');
    if (control) {
      control.setValue(!control.value);
    }
  }

  toggleTrapsAndUpdate(): void {
    const control = this.snmpForm.get('TRAPS_ENABLED');
    if (control) {
      control.setValue(!control.value);
    }
  }

  toggleDisplayOidAndUpdate(): void {
    const control = this.snmpForm.get('DISPLAY_OID_ON_STATUS_PAGE');
    if (control) {
      control.setValue(!control.value);
    }
  }

  private updateControlStates(): void {
    const agentEnabled = this.snmpForm.get('AGENT_ENABLED')?.value;
    const trapsEnabled = this.snmpForm.get('TRAPS_ENABLED')?.value;

    const agentControls = ['COMMUNITY', 'PORT', 'PROTOCOL'];
    const trapControls = ['TRAP_TARGET', 'TRAP_PORT', 'TRAP_COMMUNITY', 'TRAP_PROTOCOL', 'TRAP_LEVEL'];

    // Handle Agent controls based on AGENT_ENABLED state
    if (agentEnabled) {
      agentControls.forEach(c => this.snmpForm.get(c)?.enable());
    } else {
      agentControls.forEach(c => this.snmpForm.get(c)?.disable());
    }

    // Handle Trap controls based on TRAPS_ENABLED state
    if (trapsEnabled) {
      trapControls.forEach(c => this.snmpForm.get(c)?.enable());
    } else {
      trapControls.forEach(c => this.snmpForm.get(c)?.disable());
    }
  }

  sendTestTrap(): void {
    this.snmpConfigService.sendTrap('This is a test trap from the fireCNC UI.');
  }
}
