import { Injectable, signal, WritableSignal, OnDestroy, effect, inject } from '@angular/core';
import { ArduinoService } from './arduino.service';
import { WebSocketService } from './websocket.service';
import { SnmpService } from './snmp.service';

export interface ServoState {
  position: number; // in mm
  limitMin: boolean;
  limitMax: boolean;
  lastMoved: number; // timestamp
}

export interface LedPixel {
  displayColor: string;
  flashing: boolean;
  brightness: number; // 0-255
}

@Injectable({
  providedIn: 'root',
})
export class ServoControlService implements OnDestroy {
  private arduinoService = inject(ArduinoService);
  private webSocketService = inject(WebSocketService);
  private snmpService = inject(SnmpService);

  private simulationInterval: any;

  // Servo states
  servoX: WritableSignal<ServoState>;
  servoY: WritableSignal<ServoState>;
  servoYY: WritableSignal<ServoState>;
  servoZ: WritableSignal<ServoState>; // NEW: Added Z-axis

  // LED strip states
  ledStripX: WritableSignal<LedPixel[]> = signal([]);
  ledStripY: WritableSignal<LedPixel[]> = signal([]);
  ledStripYY: WritableSignal<LedPixel[]> = signal([]);

  private moveDirectionX: 1 | -1 = 1;
  private moveDirectionY: 1 | -1 = 1;
  private moveDirectionYY: 1 | -1 = 1;
  private moveDirectionZ: 1 | -1 = 1; // NEW: Added Z-axis movement direction
  
  // System and animation state
  private systemState = signal<'startup' | 'post_startup_white' | 'running'>('startup');
  private knightRiderState = { y: { pos: 0, dir: 1 }, yy: { pos: 0, dir: 1 } };
  private flashState = false;

  // Shutdown and Chase effects state
  private shutdownStartTime = signal<number | null>(null);
  private chaseInterval: any;
  private chaseActive = signal(false);
  private chaseStartTime = signal<number | null>(null);
  private readonly CHASE_DURATION = 4000; // 4 seconds for a chase pass

  constructor() {
    const now = Date.now();
    this.servoX = signal({ position: 0, limitMin: false, limitMax: false, lastMoved: now });
    this.servoY = signal({ position: 0, limitMin: false, limitMax: false, lastMoved: now });
    this.servoYY = signal({ position: 0, limitMin: false, limitMax: false, lastMoved: now });
    this.servoZ = signal({ position: 0, limitMin: false, limitMax: false, lastMoved: now }); // NEW: Initialize Z-axis

    this.initializeStrips();
    this.startSimulation();

    // Re-initialize strips if LED counts change in config
    effect(() => {
      this.arduinoService.ledsConfig(); // depend on config
      this.initializeStrips();
    });

    // Effect for dynamic brightness adjustment
    effect(() => {
      const config = this.arduinoService.ledsConfig();
      if (!config.DYNAMIC_BRIGHTNESS_ENABLED) {
        return;
      }

      const power = this.snmpService.ledPowerConsumption();
      const maxPower = config.MAX_POWER_CONSUMPTION;
      const currentBrightness = this.arduinoService.ledsState().brightness;

      // Check if power exceeds the limit and brightness is not already zero
      if (power > maxPower && currentBrightness > 0) {
        // Calculate a new brightness based on the power ratio.
        // Apply a small buffer (e.g., 99%) to prevent oscillating at the boundary.
        const targetPower = maxPower * 0.99;
        const reductionFactor = targetPower / power;
        const newBrightness = Math.max(0, Math.floor(currentBrightness * reductionFactor));
        
        // Only update if the brightness value actually changes.
        if (newBrightness < currentBrightness) {
          console.log(`Dynamic Brightness: Power limit exceeded (${power.toFixed(2)}W > ${maxPower}W). Reducing brightness from ${currentBrightness} to ${newBrightness}.`);
          this.arduinoService.updateLedsState({ brightness: newBrightness });
        }
      }
    });

    // Effect to control system state based on connection
    effect(() => {
      const status = this.webSocketService.connectionStatus();
      if (status === 'connected') {
        setTimeout(() => {
          this.systemState.set('post_startup_white');
        }, 10000);
      } else if (status === 'restarting' || status === 'connecting') {
        this.systemState.set('startup');
      }
    });

    // Effect to handle shutdown visual sequence
    effect(() => {
      if (this.arduinoService.isShuttingDown()) {
        this.shutdownStartTime.set(Date.now());
      } else {
        this.shutdownStartTime.set(null);
      }
    });

    // Effect to manage the periodic LED chase
    effect(() => {
      const config = this.arduinoService.ledsConfig();
      clearInterval(this.chaseInterval);
      if (config.LED_CHASE) {
        this.chaseInterval = setInterval(() => {
          if (!this.chaseActive()) { // Prevent overlap
            this.chaseActive.set(true);
            this.chaseStartTime.set(Date.now());
            setTimeout(() => {
              this.chaseActive.set(false);
              this.chaseStartTime.set(null);
            }, this.CHASE_DURATION);
          }
        }, config.LED_CHASE_TIMEOUT * 1000);
      }
    });
  }

  ngOnDestroy() {
    clearInterval(this.simulationInterval);
    clearInterval(this.chaseInterval);
  }

  private initializeStrips(): void {
    const config = this.arduinoService.ledsConfig();
    this.ledStripX.set(this.createStrip(config.COUNT_X));
    this.ledStripY.set(this.createStrip(config.COUNT_Y));
    this.ledStripYY.set(this.createStrip(config.COUNT_YY));
  }

  private createStrip(count: number): LedPixel[] {
    const baseColor = this.arduinoService.ledsState().color;
    const baseBrightness = this.arduinoService.ledsState().brightness;
    return Array(count).fill({
      displayColor: baseColor,
      flashing: false,
      brightness: baseBrightness,
    });
  }

  private startSimulation(): void {
    this.simulationInterval = setInterval(() => {
      // Update animation states
      this.updateKnightRider();
      this.flashState = !this.flashState;
      
      // Only move servos if not shutting down
      if (!this.arduinoService.isShuttingDown()) {
        this.updateServoPositions();
      }
      this.updateAllLedStrips();
    }, 100); // Run simulation at 10Hz for smooth movement
  }
  
  private updateKnightRider(): void {
    const y_len = this.ledStripY().length;
    if (y_len > 0) {
        this.knightRiderState.y.pos += this.knightRiderState.y.dir * Math.max(1, Math.floor(y_len / 50));
        if (this.knightRiderState.y.pos >= y_len) { this.knightRiderState.y.pos = y_len - 1; this.knightRiderState.y.dir = -1; }
        if (this.knightRiderState.y.pos < 0) { this.knightRiderState.y.pos = 0; this.knightRiderState.y.dir = 1; }
    }
    
    const yy_len = this.ledStripYY().length;
    if (yy_len > 0) {
        this.knightRiderState.yy.pos += this.knightRiderState.yy.dir * Math.max(1, Math.floor(yy_len / 50));
        if (this.knightRiderState.yy.pos >= yy_len) { this.knightRiderState.yy.pos = yy_len - 1; this.knightRiderState.yy.dir = -1; }
        if (this.knightRiderState.yy.pos < 0) { this.knightRiderState.yy.pos = 0; this.knightRiderState.yy.dir = 1; }
    }
  }

  private updateServoPositions(): void {
    const tableConfig = this.arduinoService.tableConfig();
    const now = Date.now();
    
    // Update X
    this.servoX.update(s => {
      let newPos = s.position + this.moveDirectionX * (tableConfig.RAIL_X / 200); // 200 steps to cross
      if (newPos >= tableConfig.RAIL_X) { newPos = tableConfig.RAIL_X; this.moveDirectionX = -1; }
      if (newPos <= 0) { newPos = 0; this.moveDirectionX = 1; }
      return { position: newPos, limitMin: newPos < 1, limitMax: newPos > tableConfig.RAIL_X - 1, lastMoved: now };
    });

    // Update Y
    this.servoY.update(s => {
      let newPos = s.position + this.moveDirectionY * (tableConfig.RAIL_Y / 200);
      if (newPos >= tableConfig.RAIL_Y) { newPos = tableConfig.RAIL_Y; this.moveDirectionY = -1; }
      if (newPos <= 0) { newPos = 0; this.moveDirectionY = 1; }
      return { position: newPos, limitMin: newPos < 1, limitMax: newPos > tableConfig.RAIL_Y - 1, lastMoved: now };
    });

    // Update YY
    this.servoYY.update(s => {
      let newPos = s.position + this.moveDirectionYY * (tableConfig.RAIL_Y / 250); // Move at different speed
      if (newPos >= tableConfig.RAIL_Y) { newPos = tableConfig.RAIL_Y; this.moveDirectionYY = -1; }
      if (newPos <= 0) { newPos = 0; this.moveDirectionYY = 1; }
      return { position: newPos, limitMin: newPos < 1, limitMax: newPos > tableConfig.RAIL_Y - 1, lastMoved: now };
    });

    // NEW: Update Z
    this.servoZ.update(s => {
      let newPos = s.position + this.moveDirectionZ * 0.5; // Simulate slower Z movement
      if (newPos >= tableConfig.RAIL_Z) { newPos = tableConfig.RAIL_Z; this.moveDirectionZ = -1; }
      if (newPos <= 0) { newPos = 0; this.moveDirectionZ = 1; }
      return { position: newPos, limitMin: newPos < 1, limitMax: newPos > (tableConfig.RAIL_Z - 1), lastMoved: now };
    });
  }

  private updateAllLedStrips(): void {
    this.ledStripX.set(this.calculateStripState('X'));
    this.ledStripY.set(this.calculateStripState('Y'));
    this.ledStripYY.set(this.calculateStripState('YY'));
  }

  private calculateStripState(axis: 'X' | 'Y' | 'YY'): LedPixel[] {
    // Highest priority: Shutdown sequence
    if (this.arduinoService.isShuttingDown()) {
      return this.calculateShutdownStripState(axis);
    }
    
    // Next priority: SD card error
    if (this.arduinoService.sdCardErrorActive()) {
      return this.calculateSdErrorStripState(axis);
    }
    
    const state = this.systemState();
    
    if (state === 'startup') {
      return this.calculateStartupStripState(axis);
    }
    
    if (state === 'post_startup_white') {
      const ledsConfig = this.arduinoService.ledsConfig();
      const masterLedsState = this.arduinoService.ledsState();
      const masterBrightness = masterLedsState.brightness;
      const ledCount = axis === 'X' ? ledsConfig.COUNT_X : axis === 'Y' ? ledsConfig.COUNT_Y : ledsConfig.COUNT_YY;
      const newStrip: LedPixel[] = new Array(ledCount);
      
      if (axis === 'Y' || axis === 'YY') {
        for (let i = 0; i < ledCount; i++) {
          newStrip[i] = { displayColor: '#FFFFFF', flashing: false, brightness: masterBrightness };
        }
        return newStrip;
      }
      // Fallthrough for axis 'X' to normal behavior
    }

    return this.calculateRunningStripState(axis);
  }
  
  private calculateShutdownStripState(axis: 'X' | 'Y' | 'YY'): LedPixel[] {
    const ledsConfig = this.arduinoService.ledsConfig();
    const ledCount = axis === 'X' ? ledsConfig.COUNT_X : axis === 'Y' ? ledsConfig.COUNT_Y : ledsConfig.COUNT_YY;
    const newStrip: LedPixel[] = new Array(ledCount);

    const startTime = this.shutdownStartTime();
    const elapsed = startTime ? Date.now() - startTime : 0;

    // From 2s to 5s, fade out. Total duration 5s.
    const fadeoutProgress = Math.max(0, Math.min(1, (elapsed - 2000) / 3000));
    const brightness = 255 * (1 - fadeoutProgress);

    for (let i = 0; i < ledCount; i++) {
        newStrip[i] = { displayColor: '#0000FF', flashing: false, brightness: Math.round(brightness) };
    }
    return newStrip;
  }

  private calculateSdErrorStripState(axis: 'X' | 'Y' | 'YY'): LedPixel[] {
    const ledsConfig = this.arduinoService.ledsConfig();
    const ledCount = axis === 'X' ? ledsConfig.COUNT_X : axis === 'Y' ? ledsConfig.COUNT_Y : ledsConfig.COUNT_YY;
    const newStrip: LedPixel[] = new Array(ledCount);

    const errorTimestamp = this.arduinoService.sdCardErrorTimestamp();
    const isFlashingPeriod = errorTimestamp ? (Date.now() - errorTimestamp < 10000) : false;

    let color = '#FF0000'; // Solid red by default after flashing period
    if (isFlashingPeriod) {
      color = this.flashState ? '#FF0000' : '#000000'; // Flash red
    }
    
    for (let i = 0; i < ledCount; i++) {
      newStrip[i] = { displayColor: color, flashing: false, brightness: 255 };
    }
    return newStrip;
  }
  
  private calculateStartupStripState(axis: 'X' | 'Y' | 'YY'): LedPixel[] {
    const ledsConfig = this.arduinoService.ledsConfig();
    const ledCount = axis === 'X' ? ledsConfig.COUNT_X : axis === 'Y' ? ledsConfig.COUNT_Y : ledsConfig.COUNT_YY;
    const newStrip: LedPixel[] = new Array(ledCount);

    if (axis === 'X') {
      // Flashing blue
      const color = this.flashState ? '#0000FF' : '#000000';
      for (let i = 0; i < ledCount; i++) {
        newStrip[i] = { displayColor: color, flashing: false, brightness: 255 };
      }
    } else {
      // Knight Rider
      const scannerPos = axis === 'Y' ? this.knightRiderState.y.pos : this.knightRiderState.yy.pos;
      const tailLength = 15;
      for (let i = 0; i < ledCount; i++) {
        const distance = Math.abs(i - scannerPos);
        if (distance === 0) { // Head of the scanner
          newStrip[i] = { displayColor: '#0000FF', flashing: false, brightness: 255 };
        } else if (distance <= tailLength) { // Tail
          const brightness = 255 * (1 - (distance / tailLength));
          newStrip[i] = { displayColor: '#0000FF', flashing: false, brightness: Math.round(brightness) };
        } else { // Off
          newStrip[i] = { displayColor: '#000000', flashing: false, brightness: 0 };
        }
      }
    }
    return newStrip;
  }

  private calculateRunningStripState(axis: 'X' | 'Y' | 'YY'): LedPixel[] {
    const ledsConfig = this.arduinoService.ledsConfig();
    const tableConfig = this.arduinoService.tableConfig();
    const masterLedsState = this.arduinoService.ledsState();

    const servoState = axis === 'X' ? this.servoX() : axis === 'Y' ? this.servoY() : this.servoYY();
    const ledCount = axis === 'X' ? ledsConfig.COUNT_X : axis === 'Y' ? ledsConfig.COUNT_Y : ledsConfig.COUNT_YY;
    const railLength = axis === 'X' ? tableConfig.RAIL_X : tableConfig.RAIL_Y;
    const defaultBrightness = axis === 'X' ? ledsConfig.DEFAULT_BRIGHTNESS_X : axis === 'Y' ? ledsConfig.DEFAULT_BRIGHTNESS_Y : ledsConfig.DEFAULT_BRIGHTNESS_YY;

    const newStrip: LedPixel[] = new Array(ledCount);

    // Check for idle
    const isIdle = (Date.now() - servoState.lastMoved) > ledsConfig.IDLE_SERVO_SECONDS * 1000;
    const brightnessMultiplier = isIdle ? (ledsConfig.IDLE_SERVO_DIM / 100) : 1;
    
    // NEW: Incorporate master LED strip brightness
    const masterBrightnessFactor = masterLedsState.brightness / 255;
    const effectiveBrightnessMultiplier = brightnessMultiplier * masterBrightnessFactor;

    const baseColor = masterLedsState.color;
    const baseBrightness = Math.round(defaultBrightness * effectiveBrightnessMultiplier);

    // 1. Set base state for all pixels
    for (let i = 0; i < ledCount; i++) {
      newStrip[i] = { displayColor: baseColor, flashing: false, brightness: baseBrightness };
    }

    // 2. Apply limit switch visualization
    const limitLedCount = 20;
    if (servoState.limitMin) {
      for (let i = 0; i < Math.min(limitLedCount, ledCount); i++) {
        newStrip[i] = { displayColor: '#FF0000', flashing: true, brightness: Math.round(255 * effectiveBrightnessMultiplier) };
      }
      for (let i = limitLedCount; i < ledCount; i++) {
        newStrip[i] = { displayColor: '#FFA500', flashing: false, brightness: baseBrightness };
      }
    }
    if (servoState.limitMax) {
      for (let i = ledCount - 1; i >= Math.max(0, ledCount - limitLedCount); i--) {
        newStrip[i] = { displayColor: '#FF0000', flashing: true, brightness: Math.round(255 * effectiveBrightnessMultiplier) };
      }
      for (let i = 0; i < ledCount - limitLedCount; i++) {
        newStrip[i] = { displayColor: '#FFA500', flashing: false, brightness: baseBrightness };
      }
    }

    // 3. Apply position indicator if no limits are active
    if (!servoState.limitMin && !servoState.limitMax) {
      const positionRatio = servoState.position / railLength;
      const centerIndex = Math.floor(positionRatio * ledCount);
      const indicatorSize = ledsConfig.AXIS_POSITION_DISPLAY;
      const start = Math.max(0, centerIndex - indicatorSize);
      const end = Math.min(ledCount - 1, centerIndex + indicatorSize);

      for (let i = start; i <= end; i++) {
        newStrip[i] = { displayColor: '#00FF00', flashing: false, brightness: Math.round(255 * effectiveBrightnessMultiplier) };
      }
    }

    // 4. Overlay chase effect if active and conditions are met
    if (this.chaseActive() && masterLedsState.color.toUpperCase() === '#FFFFFF') {
        const chaseProgress = (Date.now() - this.chaseStartTime()!) / this.CHASE_DURATION;
        const scannerPos = Math.floor(chaseProgress * ledCount);
        const tailLength = Math.max(10, Math.floor(ledCount * 0.1)); // 10% tail
        const chaseColor = '#800080'; // Purple

        for (let i = 0; i < ledCount; i++) {
            const distance = Math.abs(i - scannerPos);
            if (distance === 0) { // Head
                newStrip[i] = { ...newStrip[i], displayColor: chaseColor, brightness: Math.round(255 * effectiveBrightnessMultiplier) };
            } else if (distance <= tailLength) { // Tail
                const chaseBrightness = 255 * (1 - (distance / tailLength));
                // Overlay the chase color, keeping the original pixel's brightness multiplier
                newStrip[i] = { ...newStrip[i], displayColor: chaseColor, brightness: Math.round(chaseBrightness * effectiveBrightnessMultiplier) };
            }
        }
    }

    return newStrip;
  }
}
