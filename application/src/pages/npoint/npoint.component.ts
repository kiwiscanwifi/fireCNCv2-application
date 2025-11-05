/**
 * @file src/pages/npoint/npoint.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for the npoint.io configuration page.
 */
import { ChangeDetectionStrategy, Component, inject, OnInit, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PersistenceService } from '../../services/persistence.service';
import { NpointService, NpointConnectionStatus } from '../../services/npoint.service';

@Component({
  selector: 'app-npoint-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './npoint.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NpointPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private persistenceService = inject(PersistenceService);
  private npointService = inject(NpointService);

  private readonly NPOINT_BIN_ID_KEY = 'fireCNC_npointBinId';

  npointForm: FormGroup;
  connectionStatus: Signal<NpointConnectionStatus> = this.npointService.connectionStatus;

  constructor() {
    this.npointForm = this.fb.group({
      binId: ['', [Validators.required, Validators.pattern('^[a-f0-9]{20}$')]],
    });
  }

  ngOnInit(): void {
    const storedBinId = this.persistenceService.getItem<string>(this.NPOINT_BIN_ID_KEY);
    if (storedBinId) {
      this.npointForm.patchValue({ binId: storedBinId });
    }
  }

  onSave(): void {
    if (this.npointForm.valid) {
      this.persistenceService.setItem(this.NPOINT_BIN_ID_KEY, this.npointForm.get('binId')?.value);
      this.npointForm.markAsPristine();
    }
  }

  onDisconnect(): void {
    this.persistenceService.setItem(this.NPOINT_BIN_ID_KEY, null);
    this.npointForm.reset();
    this.npointForm.markAsPristine();
  }

  getStatusColorClass(): string {
    switch (this.connectionStatus()) {
      case 'Connected': return 'text-green-400';
      case 'Connecting': return 'text-yellow-400';
      case 'Error': return 'text-red-400';
      case 'Disconnected':
      default:
        return 'text-gray-500';
    }
  }
}
