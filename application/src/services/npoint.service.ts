/**
 * @file src/services/npoint.service.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Manages the connection and data synchronization with npoint.io.
 */
import { Injectable, signal, WritableSignal } from '@angular/core';

export type NpointConnectionStatus = 'Disconnected' | 'Connecting' | 'Connected' | 'Error';

@Injectable({
  providedIn: 'root',
})
export class NpointService {
  connectionStatus: WritableSignal<NpointConnectionStatus> = signal('Disconnected');
  data: WritableSignal<Record<string, any>> = signal({});

  private binId: string | null = null;
  private saveTimeout: any = null;
  private readonly SAVE_DEBOUNCE_MS = 2000;

  connect(binId: string | null): void {
    if (!binId || binId.trim().length === 0) {
      this.disconnect();
      return;
    }

    if (this.binId === binId && this.connectionStatus() !== 'Disconnected' && this.connectionStatus() !== 'Error') {
      return; // Already connected or connecting to the same bin
    }

    this.binId = binId;
    this.connectionStatus.set('Connecting');
    this.loadData();
  }

  disconnect(): void {
    this.binId = null;
    clearTimeout(this.saveTimeout);
    this.connectionStatus.set('Disconnected');
    this.data.set({});
  }

  private async loadData(): Promise<void> {
    if (!this.binId) return;

    try {
      const response = await fetch(`https://api.npoint.io/${this.binId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch data from npoint.io (Status: ${response.status})`);
      }
      const jsonData = await response.json();
      this.data.set(jsonData || {}); // Ensure data is an object
      this.connectionStatus.set('Connected');
      console.log('Npoint: Data loaded successfully.');
    } catch (e) {
      console.error('Npoint: Error loading data:', e);
      this.connectionStatus.set('Error');
    }
  }

  updateData(key: string, value: any): void {
    this.data.update(currentData => {
      const newData = { ...currentData };
      if (value === null || value === undefined) {
        delete newData[key];
      } else {
        newData[key] = value;
      }
      return newData;
    });
    this.scheduleSave();
  }

  private scheduleSave(): void {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveData();
    }, this.SAVE_DEBOUNCE_MS);
  }

  private async saveData(): Promise<void> {
    if (!this.binId || this.connectionStatus() === 'Disconnected' || this.connectionStatus() === 'Connecting') {
      return;
    }

    try {
      const response = await fetch(`https://api.npoint.io/${this.binId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.data(), null, 2),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.error(`Npoint: Authorization error (Status: ${response.status}). The bin might be locked or require an API key.`);
          this.connectionStatus.set('Error');
        }
        throw new Error(`Failed to save data to npoint.io (Status: ${response.status})`);
      }

      // If save was successful, we can transition from Error back to Connected
      if (this.connectionStatus() === 'Error') {
        this.connectionStatus.set('Connected');
      }

      console.log('Npoint: Data saved successfully.');
    } catch (e) {
      console.error('Npoint: Error saving data:', e);
      // The status is set to 'Error' for auth issues above. Other network errors will just be logged.
    }
  }
}