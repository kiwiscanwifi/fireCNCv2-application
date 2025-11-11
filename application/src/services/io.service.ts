import { Injectable, signal, WritableSignal, OnDestroy, effect, inject } from '@angular/core';
import { SnmpConfigService } from './snmp-config.service';
import { StateService } from './state.service';
import { SystemStateService } from './system-state.service';
import { Injector } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class IoService {
  private snmpConfigService = inject(SnmpConfigService);
  private stateService = inject(StateService);
  private injector = inject(Injector);
  private _systemStateService!: SystemStateService;

  private get systemStateService(): SystemStateService {
    if (!this._systemStateService) {
      this._systemStateService = this.injector.get(SystemStateService);
    }
    return this._systemStateService;
  }
  
  // State is now in StateService. This service contains only logic.
  private digitalInputs = this.stateService.digitalInputs;
  private buzzerEnabled = this.stateService.buzzerEnabled;
  private watchdogConfig = this.stateService.watchdogConfig;

  private previousDigitalInputs: boolean[] = Array(8).fill(false);
  private previousShutdownPinState = false;
  
  constructor() {
    // Effect to trap on GPIO input changes
    effect(() => {
      const currentInputs = this.digitalInputs();
      for (let i = 0; i < currentInputs.length; i++) {
        if (currentInputs[i] !== this.previousDigitalInputs[i]) {
          const status = currentInputs[i] ? 'HIGH' : 'LOW';
          this.snmpConfigService.sendTrap(`GPIO${i + 4} (DI_${i}) changed state to ${status}.`);
        }
      }
      this.previousDigitalInputs = [...currentInputs];
    });

    // Effect to handle shutdown pin
    effect(() => {
      const shutdownPin = this.watchdogConfig().PIN_SHUTDOWN;
      const pinIndex = shutdownPin - 4; // DI_0 is GPIO4, DI_1 is GPIO5 etc.

      if (pinIndex >= 0 && pinIndex < 8) {
        const currentPinState = this.digitalInputs()[pinIndex];
        // Trigger only on the rising edge (from false to true)
        if (currentPinState && !this.previousShutdownPinState) {
          console.log(`Shutdown pin GPIO${shutdownPin} detected as HIGH. Initiating shutdown.`);
          this.systemStateService.shutdownDevice();
        }
        this.previousShutdownPinState = currentPinState;
      }
    });
  }

  private simulateLatency(callback: () => void) {
    setTimeout(callback, 100 + Math.random() * 200);
  }

  public setDigitalOutput(index: number, state: boolean): void {
    if (index < 0 || index > 7) return;

    this.simulateLatency(() => {
      this.stateService.digitalOutputs.update(outputs => {
        const newOutputs = [...outputs];
        newOutputs[index] = state;
        return newOutputs;
      });
      console.log(`SET DO_${index}=${state ? 'ON' : 'OFF'}`);
    });
  }

  public toggleBuzzer(): void {
    this.buzzerEnabled.update(enabled => !enabled);
    console.log(`SET BUZZER=${this.buzzerEnabled() ? 'ON' : 'OFF'}`);
  }
  
  public triggerBeep(times: number): void {
    if (!this.buzzerEnabled()) return;
    console.log(`BEEP x${times}`); // Simulation
  }
}
