import { Injectable, signal, WritableSignal } from '@angular/core';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'restarting';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private readonly MAX_LOG_ENTRIES = 100;
  private connectionTimeout: any; // Manages simulated connection delay

  connectionStatus: WritableSignal<ConnectionStatus> = signal('disconnected');
  logMessages: WritableSignal<string[]> = signal([]);
  lastConnectedTimestamp: WritableSignal<number | null> = signal(null);

  /**
   * Simulates a WebSocket connection attempt, transitioning through 'connecting' to 'connected'.
   */
  public simulateConnect(): void {
    clearTimeout(this.connectionTimeout); // Clear any pending simulated connections
    this.connectionStatus.set('connecting');
    this.addLogMessage('--- Simulating WebSocket connection... ---');

    // Simulate a connection delay
    this.connectionTimeout = setTimeout(() => {
      this.connectionStatus.set('connected');
      this.lastConnectedTimestamp.set(Date.now());
      this.addLogMessage('--- Simulated WebSocket connection established ---');
    }, 2000); // Simulate a 2-second connection time
  }

  /**
   * Simulates a disconnection from the WebSocket.
   */
  public simulateDisconnect(): void {
    clearTimeout(this.connectionTimeout); // Clear any pending simulated connections
    // Only set to disconnected if not already in a restarting state
    if (this.connectionStatus() !== 'restarting') {
        this.connectionStatus.set('disconnected');
        this.lastConnectedTimestamp.set(null);
        this.addLogMessage('--- Simulated WebSocket connection disconnected ---');
    }
  }

  /**
   * Sets the connection status to 'restarting'.
   */
  public setRestarting(): void {
    clearTimeout(this.connectionTimeout); // Clear any pending simulated connections
    this.connectionStatus.set('restarting');
    this.lastConnectedTimestamp.set(null); // Clear timestamp
    this.addLogMessage('--- Simulated WebSocket connection restarting ---');
  }

  clearLogs(): void {
    this.logMessages.set([]);
  }

  private addLogMessage(message: string) {
    this.logMessages.update(logs => {
      const newLogs = [...logs, message];
      // Keep the log from growing indefinitely
      return newLogs.slice(Math.max(newLogs.length - this.MAX_LOG_ENTRIES, 0));
    });
  }
}