import { Injectable, signal, WritableSignal } from '@angular/core';

export type FirebaseStatus = 'unconfigured' | 'connecting' | 'connected' | 'error';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  status: WritableSignal<FirebaseStatus> = signal('unconfigured');
  lastSync: WritableSignal<Date | null> = signal(null);
  errorMessage: WritableSignal<string | null> = signal(null);
  
  // Placeholder for configuration
  private config = signal<any | null>(null);

  constructor() {}

  connect(config: any): void {
    if (!config) {
      this.status.set('error');
      this.errorMessage.set('Configuration is missing.');
      return;
    }
    this.config.set(config);
    this.status.set('connecting');
    console.log('Simulating connection to Firebase with config:', config);
    
    setTimeout(() => {
      // Simulate a connection success/failure
      if (config.apiKey && config.projectId) {
        this.status.set('connected');
        this.errorMessage.set(null);
        console.log('Successfully connected to Firebase (Simulated).');
        this.syncData();
      } else {
        this.status.set('error');
        this.errorMessage.set('Invalid configuration. apiKey and projectId are required.');
        console.error('Firebase connection failed (Simulated).');
      }
    }, 2000);
  }

  disconnect(): void {
    this.status.set('unconfigured');
    this.config.set(null);
    this.lastSync.set(null);
    this.errorMessage.set(null);
    console.log('Disconnected from Firebase (Simulated).');
  }

  syncData(): void {
    if (this.status() !== 'connected') {
      console.warn('Cannot sync data, not connected to Firebase.');
      return;
    }
    console.log('Simulating data sync with Firebase...');
    // In a real app, this would push/pull data from Firestore/Realtime Database
    setTimeout(() => {
      this.lastSync.set(new Date());
      console.log('Firebase data sync complete (Simulated).');
    }, 1500);
  }
}
