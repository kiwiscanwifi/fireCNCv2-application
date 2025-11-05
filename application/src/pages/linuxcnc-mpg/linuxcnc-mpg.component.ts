import { ChangeDetectionStrategy, Component, signal, WritableSignal, ElementRef, viewChild, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModuleService } from '../../services/module.service';

type Axis = 'X' | 'Y' | 'Z' | 'A' | 'B' | 'C';
type MpgMode = 'STEP' | 'VELOCITY';

@Component({
  selector: 'app-linuxcnc-mpg',
  imports: [CommonModule],
  templateUrl: './linuxcnc-mpg.component.html',
  styleUrls: ['./linuxcnc-mpg.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'handleKeyDown($event)',
    '(window:mouseup)': 'onDialMouseUp($event)' // Global mouseup to catch releases outside the component
  }
})
export class LinuxcncMpgComponent {
  private moduleService = inject(ModuleService);

  // --- UI State Signals ---
  selectedAxis: WritableSignal<Axis> = signal('X');
  selectedMode: WritableSignal<MpgMode> = signal('STEP');
  stepSize = signal(0.01);
  feedOverride = signal(100); // in percent
  spindleOverride = signal(100); // in percent
  spindleState = signal<'OFF' | 'FWD' | 'REV'>('OFF');
  dialRotation = signal(0);

  // --- New signals for Jog Dial Dragging ---
  isDragging = signal(false);
  lastAngle = signal(0);
  dialElement = viewChild<ElementRef<HTMLDivElement>>('jogDial');

  // --- Simulated Machine State ---
  machineCoords = signal({ x: 123.456, y: 78.901, z: 23.456, a: 0.000, b: 0.000, c: 0.000 });
  workCoords = signal({ x: 23.456, y: -10.123, z: 0.000, a: 0.000, b: 0.000, c: 0.000 });

  readonly stepSizes = [0.001, 0.01, 0.1, 1];

  // --- Dynamic Axis Configuration ---
  mpgModule = computed(() => this.moduleService.installedModules().find(m => m.function === 'MPG'));

  enabledAxes = computed((): Axis[] => {
    const module = this.mpgModule();
    if (!module || !module.ports || module.ports.length === 0) {
      // Fallback for when the module isn't configured correctly or not found
      return ['X', 'Y', 'Z']; 
    }
    // Filter enabled ports and map their names to the Axis type
    return module.ports
      .filter(p => p.enabled)
      .map(p => p.name as Axis);
  });

  enabledAxisData = computed(() => {
    const module = this.mpgModule();
    if (!module || !module.ports || module.ports.length === 0) {
      // Fallback matches enabledAxes fallback
      return ['X', 'Y', 'Z'].map(axis => ({ key: axis as Axis, displayName: axis }));
    }
    return module.ports
      .filter(p => p.enabled)
      .map(p => ({
        key: p.name as Axis,
        displayName: p.alias || p.name
      }));
  });

  displayCoords = computed(() => {
    const enabledData = this.enabledAxisData();
    const machine = this.machineCoords();
    const work = this.workCoords();

    return enabledData.map(axisData => {
      const lowerKey = axisData.key.toLowerCase() as keyof typeof machine;
      return {
        key: axisData.key,
        displayName: axisData.displayName,
        machineValue: machine[lowerKey],
        workValue: work[lowerKey]
      };
    });
  });

  constructor() {
    effect(() => {
      const axes = this.enabledAxes();
      if (axes.length > 0) {
        // If current axis is not in the new list, or if it's the first run, set to the first available axis
        if (!axes.includes(this.selectedAxis())) {
          this.selectedAxis.set(axes[0]);
        }
      }
    });
  }

  selectAxis(axis: Axis) {
    this.selectedAxis.set(axis);
    console.log(`Axis selected: ${axis}`);
  }

  selectMode(mode: MpgMode) {
    this.selectedMode.set(mode);
    console.log(`Mode selected: ${mode}`);
  }

  selectStepSize(size: number) {
    this.stepSize.set(size);
    console.log(`Step size selected: ${size}`);
  }

  updateFeedOverride(event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.feedOverride.set(value);
    console.log(`Feed override set to: ${value}%`);
  }

  updateSpindleOverride(event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.spindleOverride.set(value);
    console.log(`Spindle override set to: ${value}%`);
  }

  setSpindle(state: 'OFF' | 'FWD' | 'REV') {
    this.spindleState.set(state);
    console.log(`Spindle set to: ${state}`);
  }

  jog(direction: 1 | -1) {
    const rotationAmount = 15 * direction; // Visual feedback for one "detent"
    this.dialRotation.update(r => r + rotationAmount);

    const axis = this.selectedAxis().toLowerCase() as 'x' | 'y' | 'z' | 'a' | 'b' | 'c';
    const jogAmount = this.stepSize() * direction;
    
    this.machineCoords.update(coords => ({...coords, [axis]: parseFloat((coords[axis] + jogAmount).toFixed(3))}));
    this.workCoords.update(coords => ({...coords, [axis]: parseFloat((coords[axis] + jogAmount).toFixed(3))}));

    console.log(`Jog command: Axis ${this.selectedAxis()}, Amount: ${jogAmount}`);
  }

  estop() {
    console.log('E-STOP ACTIVATED');
    // In a real app, this would send an immediate stop command
  }

  // --- New Methods for Drag-to-Spin ---

  onDialMouseDown(event: MouseEvent) {
    event.preventDefault();
    this.isDragging.set(true);
    const angle = this.calculateAngle(event.clientX, event.clientY);
    this.lastAngle.set(angle);
  }

  onDialMouseMove(event: MouseEvent) {
    if (!this.isDragging()) return;
    event.preventDefault();
    
    const newAngle = this.calculateAngle(event.clientX, event.clientY);
    let angleDelta = newAngle - this.lastAngle();

    // Handle wrap-around (crossing 180/-180 degree line)
    if (angleDelta > 180) angleDelta -= 360;
    if (angleDelta < -180) angleDelta += 360;

    const detentThreshold = 15; // Degrees per "click"

    if (Math.abs(angleDelta) >= detentThreshold) {
      const direction = Math.sign(angleDelta) as 1 | -1;
      this.jog(direction);
      this.lastAngle.set(newAngle);
    }
  }

  // This will be called by the global host listener
  onDialMouseUp(event: MouseEvent) {
    if(this.isDragging()) {
      event.preventDefault();
      this.isDragging.set(false);
    }
  }
  
  private calculateAngle(mouseX: number, mouseY: number): number {
    const dial = this.dialElement()?.nativeElement;
    if (!dial) return 0;

    const rect = dial.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = mouseX - centerX;
    const deltaY = mouseY - centerY;
    
    // atan2 returns angle in radians from -PI to PI. Convert to degrees.
    return Math.atan2(deltaY, deltaX) * (180 / Math.PI);
  }

  // --- New Method for Keyboard Shortcuts ---

  handleKeyDown(event: KeyboardEvent) {
    // Prevent browser shortcuts if the user is typing in an input elsewhere
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
    }

    let axis: Axis | null = null;
    let direction: (1 | -1) | null = null;

    switch (event.key) {
      case 'ArrowLeft':
        axis = 'X';
        direction = -1;
        break;
      case 'ArrowRight':
        axis = 'X';
        direction = 1;
        break;
      case 'ArrowUp':
        event.preventDefault(); // Prevent page scroll
        axis = 'Y';
        direction = 1;
        break;
      case 'ArrowDown':
        event.preventDefault(); // Prevent page scroll
        axis = 'Y';
        direction = -1;
        break;
      case '+':
      case '=': // Handle '+' on keyboards without numpad
        axis = 'Z';
        direction = 1;
        break;
      case '-':
      case '_': // Handle '-' on keyboards without numpad
        axis = 'Z';
        direction = -1;
        break;
    }

    if (axis && direction && this.enabledAxes().includes(axis)) {
      this.selectAxis(axis);
      this.jog(direction);
    }
  }
}
