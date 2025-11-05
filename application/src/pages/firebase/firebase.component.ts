/**
 * @file src/pages/firebase/firebase.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for the Firebase configuration page.
 */
import { ChangeDetectionStrategy, Component, inject, OnInit, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PersistenceService } from '../../services/persistence.service';
import { FirebaseService, FirebaseConfig, FirebaseConnectionStatus } from '../../services/firebase.service';

@Component({
  selector: 'app-firebase-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './firebase.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FirebasePageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private persistenceService = inject(PersistenceService);
  private firebaseService = inject(FirebaseService);

  private readonly FIREBASE_CONFIG_KEY = 'fireCNC_firebaseConfig';

  firebaseForm: FormGroup;
  connectionStatus: Signal<FirebaseConnectionStatus> = this.firebaseService.connectionStatus;

  constructor() {
    this.firebaseForm = this.fb.group({
      apiKey: ['', Validators.required],
      authDomain: ['', Validators.required],
      // FIX: Changed regex literal to a string to avoid potential parsing issues that could cause downstream errors.
      databaseURL: ['', [Validators.required, Validators.pattern('^https://.*\\.firebaseio\\.com$')]],
      projectId: ['', Validators.required],
      storageBucket: ['', Validators.required],
      messagingSenderId: ['', Validators.required],
      appId: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    const storedConfig = this.persistenceService.getItem<FirebaseConfig>(this.FIREBASE_CONFIG_KEY);
    if (storedConfig) {
      this.firebaseForm.patchValue(storedConfig);
    }
  }

  onSave(): void {
    if (this.firebaseForm.valid) {
      this.persistenceService.setItem(this.FIREBASE_CONFIG_KEY, this.firebaseForm.getRawValue());
      this.firebaseForm.markAsPristine();
    }
  }

  onDisconnect(): void {
    this.persistenceService.setItem(this.FIREBASE_CONFIG_KEY, null);
    this.firebaseForm.reset();
    this.firebaseForm.markAsPristine();
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
