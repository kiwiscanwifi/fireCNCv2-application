/**
 * @file src/services/firebase.service.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Manages the connection and data synchronization with Firebase Realtime Database.
 */
import { Injectable, signal, WritableSignal } from '@angular/core';

// Let TypeScript know about the global firebase object from the CDN script
declare var firebase: any;

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export type FirebaseConnectionStatus = 'Disconnected' | 'Connecting' | 'Connected' | 'Error';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  connectionStatus: WritableSignal<FirebaseConnectionStatus> = signal('Disconnected');
  data: WritableSignal<Record<string, any>> = signal({});
  
  private app: any = null;
  private db: any = null;
  private isInitialized = false;

  connect(config: FirebaseConfig | null): void {
    if (!config || !this.isConfigValid(config)) {
      this.disconnect();
      return;
    }
    
    if (typeof firebase === 'undefined') {
      console.error('Firebase SDK not loaded.');
      this.connectionStatus.set('Error');
      return;
    }

    this.connectionStatus.set('Connecting');

    try {
      if (this.isInitialized) {
        // Firebase doesn't have a simple "disconnect and reconnect with new config" API.
        // The standard way is to delete the app and create a new one.
        firebase.app().delete();
      }
      
      this.app = firebase.initializeApp(config);
      this.db = firebase.database();
      this.isInitialized = true;

      const connectedRef = firebase.database().ref('.info/connected');
      connectedRef.on('value', (snap: any) => {
        if (snap.val() === true) {
          this.connectionStatus.set('Connected');
          this.loadInitialData();
        } else {
          // If we are initialized but not getting a 'true' value, we are in a 'connecting' state.
          if (this.isInitialized) {
            this.connectionStatus.set('Connecting');
          }
        }
      });
    } catch (e) {
      console.error('Firebase initialization error:', e);
      this.connectionStatus.set('Error');
      this.isInitialized = false;
    }
  }
  
  disconnect(): void {
    if (this.isInitialized && typeof firebase !== 'undefined' && firebase.app) {
        try {
            firebase.app().delete();
        } catch (e) {
            console.error("Error deleting firebase app:", e);
        }
    }
    this.isInitialized = false;
    this.app = null;
    this.db = null;
    this.connectionStatus.set('Disconnected');
    this.data.set({});
  }

  private loadInitialData(): void {
    const dataRef = firebase.database().ref('fireCNC/data');
    
    // Fetch once to get the initial state
    dataRef.get().then((snapshot: any) => {
        if (snapshot.exists()) {
            this.data.set(snapshot.val());
            console.log('Firebase: Initial data loaded.');
        } else {
            console.log('Firebase: No initial data found.');
        }
    }).catch((error: any) => {
        console.error("Firebase: Error getting initial data:", error);
    });

    // Then listen for any future changes to keep the cache in sync
    dataRef.on('value', (snapshot: any) => {
      if (snapshot.exists()) {
        this.data.set(snapshot.val());
      }
    });
  }

  async setData(path: string, value: any): Promise<void> {
    if (this.connectionStatus() !== 'Connected' || !this.db) {
        // Don't warn here, as this is expected during offline operation.
        // The localStorage fallback in PersistenceService will handle it.
        return;
    }
    try {
        // Using `set` with `null` will delete the data at the specified location.
        await firebase.database().ref(path).set(value);
    } catch (error) {
        console.error(`Firebase: Failed to set data at ${path}`, error);
    }
  }

  isConfigValid(config: FirebaseConfig): boolean {
    return Object.values(config).every(val => val && typeof val === 'string' && val.length > 0);
  }
}