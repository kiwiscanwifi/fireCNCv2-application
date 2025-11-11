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
import { Injectable } from '@angular/core';

export interface StorageUsage {
  usedBytes: number;
  totalBytes: number;
}

@Injectable({
  providedIn: 'root',
})
export class PersistenceService {
  private readonly LOCAL_STORAGE_CAPACITY_BYTES = 16 * 1024 * 1024; // 16MB estimate

  constructor() {}

  /**
   * Retrieves an item from localStorage.
   * @param key The key of the item to retrieve.
   * @returns The parsed item, or null if not found or on error.
   */
  getItem<T>(key: string): T | null {
    return this.getFromLocalStorage(key);
  }

  /**
   * Serializes an item and stores it in localStorage.
   * @param key The key to store the item under.
   * @param value The value to store.
   */
  setItem<T>(key: string, value: T): void {
    this.saveToLocalStorage(key, value);
  }

  /**
   * Retrieves all keys from localStorage that start with a given prefix.
   * @param prefix The prefix to search for.
   * @returns An array of matching keys.
   */
  getKeys(prefix: string): string[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keys.push(key);
      }
    }
    return keys;
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
