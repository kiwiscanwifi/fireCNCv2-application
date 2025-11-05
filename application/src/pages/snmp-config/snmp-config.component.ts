/**
 * @file src/pages/snmp-config/snmp-config.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for the SNMP Configuration page. Displays SNMP settings and allows
 * for sending test traps.
 */
import { ChangeDetectionStrategy, Component, Signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SnmpConfigService, SnmpConfig } from '../../services/snmp-config.service';

@Component({
  selector: 'app-snmp-config-page',
  imports: [CommonModule],
  templateUrl: './snmp-config.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SnmpConfigPageComponent {
  private snmpConfigService = inject(SnmpConfigService);
  config: Signal<SnmpConfig> = this.snmpConfigService.config;

  sendTestTrap(): void {
    this.snmpConfigService.sendTrap('This is a test trap from the fireCNC UI.');
  }
}