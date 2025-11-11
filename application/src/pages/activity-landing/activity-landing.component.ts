import { ChangeDetectionStrategy, Component, inject, Signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SnmpConfigService } from '../../services/snmp-config.service';

interface ActivityLink {
  path: string;
  icon: string;
  title: string;
  description: string;
  condition?: () => boolean; // A function that returns a boolean
}

@Component({
  selector: 'app-activity-landing',
  imports: [CommonModule, RouterLink],
  templateUrl: './activity-landing.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityLandingComponent {
  private snmpConfigService = inject(SnmpConfigService);
  
  trapsEnabled: Signal<boolean> = computed(() => this.snmpConfigService.config().TRAPS_ENABLED);

  activityLinks: ActivityLink[] = [
    { path: '/activity/console', icon: 'fa-solid fa-greater-than', title: 'Console Output', description: 'View raw, live logs from the device.' },
    { path: '/activity/system-log', icon: 'fa-solid fa-file-lines', title: 'System Log', description: 'Browse formatted system event logs.' },
    { path: '/activity/snmp-traps', icon: 'fa-solid fa-clipboard-list', title: 'SNMP Log', description: 'See a history of all sent SNMP traps.', condition: this.trapsEnabled },
  ];
}