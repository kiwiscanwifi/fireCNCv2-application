import { ChangeDetectionStrategy, Component, computed, inject, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardSettingsService } from '../../services/dashboard-settings.service';
import { SnmpService } from '../../services/snmp.service';

interface VisibleAnalogInput {
  ID: number;
  NAME: string;
  value: number;
  percent: number;
}

@Component({
  selector: 'app-analog-inputs',
  imports: [CommonModule],
  templateUrl: './analog-inputs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalogInputsComponent {
  private dashboardSettingsService = inject(DashboardSettingsService);
  private snmpService = inject(SnmpService);

  private analogInputsConfig = this.dashboardSettingsService.analogInputsConfig;
  private analogInputValues = this.snmpService.analogInputs;

  visibleInputs: Signal<VisibleAnalogInput[]> = computed(() => {
    const configs = this.analogInputsConfig();
    const values = this.analogInputValues();

    return configs
      .filter(config => config.ENABLED)
      .map(config => ({
        ID: config.ID,
        NAME: config.NAME,
        value: values[config.ID] ?? 0,
        percent: ((values[config.ID] ?? 0) / 4095) * 100
      }));
  });
}
