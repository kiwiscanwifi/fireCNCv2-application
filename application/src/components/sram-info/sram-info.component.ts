/**
 * @file src/components/sram-info/sram-info.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for displaying SRAM usage information.
 */
import { ChangeDetectionStrategy, Component, Signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SnmpService, SramInfo } from '../../services/snmp.service';

@Component({
  selector: 'app-sram-info',
  imports: [CommonModule],
  templateUrl: './sram-info.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SramInfoComponent {
  private snmpService = inject(SnmpService);
  
  sramInfo: Signal<SramInfo> = this.snmpService.sramInfo;
  sramUsedPercent: Signal<number> = this.snmpService.sramUsedPercent;
}
