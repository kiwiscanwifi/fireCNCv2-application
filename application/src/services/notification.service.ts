import { Injectable, signal, WritableSignal } from '@angular/core';

export interface GlobalNotification {
  id: number;
  type: 'error' | 'success' | 'alexa';
  message: string;
  timestamp: number;
  fadingOut?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  notifications: WritableSignal<GlobalNotification[]> = signal([]);
  private nextId = 0;
  private readonly FADE_OUT_DURATION = 300; // ms, should match CSS animation

  private addNotification(type: 'error' | 'success' | 'alexa', message: string, duration: number): void {
    // Check if a notification with the same type and message is already visible to prevent duplicates.
    const alreadyExists = this.notifications().some(n => n.type === type && n.message === message && !n.fadingOut);
    if (alreadyExists) {
      return;
    }
    
    const id = this.nextId++;
    const newNotification: GlobalNotification = { id, type, message, timestamp: Date.now(), fadingOut: false };
    this.notifications.update(current => [...current, newNotification]);

    // Programmatically remove the notification after the duration has passed using a two-stage process.
    if (duration > 0 && duration > this.FADE_OUT_DURATION) {
      // Stage 1: After the main duration (minus animation time), trigger the fade-out
      window.setTimeout(() => {
        this.notifications.update(current => 
          current.map(n => n.id === id ? { ...n, fadingOut: true } : n)
        );

        // Stage 2: After the fade-out animation completes, remove the element
        window.setTimeout(() => {
          this.clearById(id);
        }, this.FADE_OUT_DURATION);

      }, duration - this.FADE_OUT_DURATION);
    }
  }

  showError(message: string): void {
    this.addNotification('error', message, 5000);
  }

  showSuccess(message: string): void {
    this.addNotification('success', message, 3000);
  }

  showAlexa(message: string): void {
    this.addNotification('alexa', message, 3000);
  }

  private clearById(id: number): void {
    this.notifications.update(current => current.filter(n => n.id !== id));
  }

  clear(notification: GlobalNotification): void {
    // When clearing manually, immediately start the fade-out process
    this.notifications.update(current => 
      current.map(n => n.id === notification.id ? { ...n, fadingOut: true } : n)
    );
    window.setTimeout(() => {
      this.clearById(notification.id);
    }, this.FADE_OUT_DURATION);
  }

  clearAll(): void {
    this.notifications.set([]);
  }

  clearAllWithFade(): void {
    if (this.notifications().length === 0) {
      return;
    }

    this.notifications.update(current => 
      current.map(n => ({ ...n, fadingOut: true }))
    );

    window.setTimeout(() => {
      this.clearAll();
    }, this.FADE_OUT_DURATION);
  }
}