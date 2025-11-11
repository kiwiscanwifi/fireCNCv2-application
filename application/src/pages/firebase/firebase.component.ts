import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-firebase-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './firebase.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FirebaseComponent {
  protected firebaseService = inject(FirebaseService);
  private fb = inject(FormBuilder);

  configForm: FormGroup;

  constructor() {
    this.configForm = this.fb.group({
      apiKey: [''],
      authDomain: [''],
      projectId: [''],
      storageBucket: [''],
    });
  }

  connect(): void {
    if (this.configForm.valid) {
      this.firebaseService.connect(this.configForm.value);
    }
  }

  disconnect(): void {
    this.firebaseService.disconnect();
  }

  sync(): void {
    this.firebaseService.syncData();
  }
}
