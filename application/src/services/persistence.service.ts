/**
 * @file src/services/persistence.service.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * A service for persisting and retrieving data from the browser's localStorage.
 * This acts as a simple non-volatile memory for the web application.
 *
 * @changelog
 * 2024-08-06:
 * - Updated default flash storage capacity to 16MB to match ESP32-S3 hardware.
 */
import { Injectable, inject } from '@angular/core';
import { NpointService } from './npoint.service';

export interface StorageUsage {
  usedBytes: number;
  totalBytes: number;
}

@Injectable({
  providedIn: 'root',
})
export class PersistenceService {
  private npointService = inject(NpointService);
  private readonly LOCAL_STORAGE_CAPACITY_BYTES = 16 * 1024 * 1024; // 16MB estimate
  private readonly NPOINT_BIN_ID_KEY = 'fireCNC_npointBinId';

  constructor() {
    // On startup, load npoint bin ID from localStorage and try to connect.
    // Use the internal method to bypass the cloud check for this specific key.
    const binId = this.getFromLocalStorage<string>(this.NPOINT_BIN_ID_KEY);
    if (binId) {
      this.npointService.connect(binId);
    }
  }

  /**
   * Retrieves an item. It prioritizes the npoint.io cache if available,
   * otherwise falls back to localStorage.
   * @param key The key of the item to retrieve.
   * @returns The parsed item, or null if not found or on error.
   */
  getItem<T>(key: string): T | null {
    // Priority 1: Get from npoint in-memory cache if connected
    if (this.npointService.connectionStatus() === 'Connected') {
        const cloudData = this.npointService.data();
        if (cloudData && cloudData.hasOwnProperty(key)) {
            // Return a deep copy to prevent accidental mutation of the signal's state
            return JSON.parse(JSON.stringify(cloudData[key])) as T;
        }
    }
    
    // Priority 2: Fallback to localStorage
    return this.getFromLocalStorage(key);
  }

  /**
   * Serializes an item and stores it. Writes to npoint.io if connected, and
   * always writes to localStorage as a backup.
   * @param key The key to store the item under.
   * @param value The value to store.
   */
  setItem<T>(key: string, value: T): void {
    // Special handling for the npoint bin ID itself
    if (key === this.NPOINT_BIN_ID_KEY) {
        // Always save bin ID to localStorage so we can connect on startup.
        this.saveToLocalStorage(key, value);
        // Connect/reconnect with the new config. A null value will disconnect.
        this.npointService.connect(value as string | null);
        return;
    }

    // For all other data, update the data in npointService, which will debounce and save.
    if (this.npointService.connectionStatus() === 'Connected') {
      this.npointService.updateData(key, value);
    }
    
    // Always save to localStorage as a fallback or for offline use.
    this.saveToLocalStorage(key, value);
  }

  private getFromLocalStorage<T>(key: string): T | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) as T : null;
    } catch (e) {
      console.error(`Error getting item '${key}' from localStorage`, e);
      return null;
    }
  }

  /**
   * Internal helper to save data to localStorage, handling null/undefined by removing the item.
   * @param key The key to store the item under.
   * @param value The value to store.
   */
  private saveToLocalStorage<T>(key: string, value: T): void {
    if (typeof localStorage === 'undefined') {
      console.warn(`localStorage is not available. Cannot save item '${key}'.`);
      return;
    }
    
    try {
      // If value is null/undefined, remove the item. Otherwise, stringify and set it.
      if (value === null || value === undefined) {
          localStorage.removeItem(key);
      } else {
          localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (e) {
      console.error(`Error setting item '${key}' in localStorage`, e);
    }
  }

  /**
   * Calculates the approximate usage of localStorage and returns it along with an
   * estimated total capacity.
   * @returns An object with used and total bytes.
   */
  getLocalStorageUsage(): StorageUsage {
    if (typeof localStorage === 'undefined') {
      return { usedBytes: 0, totalBytes: this.LOCAL_STORAGE_CAPACITY_BYTES };
    }

    let totalBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          totalBytes += (key.length + value.length) * 2; // UTF-16 characters are 2 bytes
        }
      }
    }

    return { usedBytes: totalBytes, totalBytes: this.LOCAL_STORAGE_CAPACITY_BYTES };
  }
}