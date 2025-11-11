import { Injectable, signal, WritableSignal, inject } from '@angular/core';
import { StateService } from './state.service';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'restarting';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private stateService = inject(StateService);
  private readonly MAX_LOG_ENTRIES = 100;
  private connectionTimeout: number | null = null; // Manages simulated connection delay

  // State is now managed by StateService
  connectionStatus = this.stateService.connectionStatus;
  logMessages = this.stateService.logMessages;
  lastConnectedTimestamp = this.stateService.lastConnectedTimestamp;
  lastFailedTimestamp = this.stateService.lastFailedTimestamp;

  /**
   * Simulates a WebSocket connection attempt, transitioning through 'connecting' to 'connected'.
   */
  public simulateConnect(): void {
    if (this.connectionTimeout !== null) {
      clearTimeout(this.connectionTimeout); // Clear any pending simulated connections
    }
    this.connectionStatus.set('connecting');
    this.addLogMessage('--- Simulating WebSocket connection... ---');

    // Simulate a connection delay
    this.connectionTimeout = window.setTimeout(() => {
      this.connectionStatus.set('connected');
      this.lastConnectedTimestamp.set(Date.now());
      this.lastFailedTimestamp.set(null); // Clear on successful connection
      this.addLogMessage('--- Simulated WebSocket connection established ---');
    }, 2000); // Simulate a 2-second connection time
  }

  /**
   * Simulates a disconnection from the WebSocket.
   */
  public simulateDisconnect(): void {
    if (this.connectionTimeout !== null) {
      clearTimeout(this.connectionTimeout); // Clear any pending simulated connections
    }
    // Only set to disconnected if not already in a restarting state
    if (this.connectionStatus() !== 'restarting') {
        this.connectionStatus.set('disconnected');
        this.lastConnectedTimestamp.set(null);
        this.lastFailedTimestamp.set(Date.now()); // Set on disconnection
        this.addLogMessage('--- Simulated WebSocket connection disconnected ---');
    }
  }

  /**
   * Sets the connection status to 'restarting'.
   */
  public setRestarting(): void {
    if (this.connectionTimeout !== null) {
      clearTimeout(this.connectionTimeout); // Clear any pending simulated connections
    }
    this.connectionStatus.set('restarting');
    this.lastConnectedTimestamp.set(null); // Clear timestamp
    this.lastFailedTimestamp.set(Date.now()); // Set on restarting (as it's a temporary break in connection)
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
