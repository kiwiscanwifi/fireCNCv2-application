import { ChangeDetectionStrategy, Component, inject, OnInit, OnDestroy, signal, WritableSignal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators, AbstractControl } from '@angular/forms';
import { DashboardSettingsService, DigitalOutputConfig, DigitalInputConfig } from '../../services/dashboard-settings.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DatePipe } from '@angular/common'; // For toast
import { RouterLink } from '@angular/router';
// FIX: Import ReactiveFormsModule
import { ReactiveFormsModule } from '@angular/forms';
import { ConfigFileService } from '../../services/config-file.service'; // NEW: Import ConfigFileService
import { ArduinoService } from '../../services/arduino.service'; // NEW: Import ArduinoService

@Component({
  selector: 'app-onboard-settings',
  imports: [CommonModule, ReactiveFormsModule, DatePipe, RouterLink],
  templateUrl: './onboard-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardSettingsComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private dashboardSettingsService = inject(DashboardSettingsService);
  private configFileService = inject(ConfigFileService); // NEW: Inject ConfigFileService
  private arduinoService = inject(ArduinoService); // NEW: Inject ArduinoService
  private destroy$ = new Subject<void>();

  onboardSettingsForm!: FormGroup;
  savedConfirmation: WritableSignal<boolean> = signal(false);

  // NEW: Add FormControls for widget titles
  digitalOutputsWidgetTitle = new FormControl('', Validators.required);
  digitalInputsWidgetTitle = new FormControl('', Validators.required);

  constructor() {
    this.onboardSettingsForm = this.fb.group({
      // NEW: Add widget title controls to the form group
      digitalOutputsWidgetTitle: this.digitalOutputsWidgetTitle,
      digitalInputsWidgetTitle: this.digitalInputsWidgetTitle,
      digitalOutputs: this.fb.array([]),
      digitalInputs: this.fb.array([]),
    });

    // Populate the form with current settings on init
    this.populateForm();

    // Use an effect to react to changes in the ArduinoService signals and repopulate the form.
    // This correctly handles WritableSignal updates without using .pipe().subscribe().
    effect(() => {
      this.arduinoService.digitalOutputsConfig(); // Depend on the signal
      this.arduinoService.digitalInputsConfig(); // Depend on the signal
      this.dashboardSettingsService.layout(); // Depend on the layout to get widget titles
      this.populateForm();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private populateForm(): void {
    const outputs = this.arduinoService.digitalOutputsConfig(); // Fetch from ArduinoService
    const inputs = this.arduinoService.digitalInputsConfig(); // Fetch from ArduinoService
    const currentLayout = this.dashboardSettingsService.layout(); // Get current dashboard layout

    // Find current widget titles from the dashboard layout for digital outputs
    const outputsWidget = currentLayout.column1.find(w => w.id === 'digital-outputs') ||
                          currentLayout.column2.find(w => w.id === 'digital-outputs');
    const currentOutputsTitle = outputsWidget?.title || 'Digital Outputs (8-DO)'; // Fallback to default

    // Find current widget titles from the dashboard layout for digital inputs
    const inputsWidget = currentLayout.column1.find(w => w.id === 'digital-inputs') ||
                         currentLayout.column2.find(w => w.id === 'digital-inputs');
    const currentInputsTitle = inputsWidget?.title || 'Digital Inputs (8-DI)'; // Fallback to default

    // Patch the new form controls with the current widget titles
    this.digitalOutputsWidgetTitle.setValue(currentOutputsTitle, { emitEvent: false });
    this.digitalInputsWidgetTitle.setValue(currentInputsTitle, { emitEvent: false });

    const digitalOutputsFormArray = this.onboardSettingsForm.get('digitalOutputs') as FormArray;
    digitalOutputsFormArray.clear({ emitEvent: false }); // Clear existing controls
    outputs.forEach(output => {
      digitalOutputsFormArray.push(this.fb.group({
        id: [output.id],
        name: [output.name, Validators.required],
        enabled: [output.enabled],
      }), { emitEvent: false });
    });

    const digitalInputsFormArray = this.onboardSettingsForm.get('digitalInputs') as FormArray;
    digitalInputsFormArray.clear({ emitEvent: false }); // Clear existing controls
    inputs.forEach(input => {
      digitalInputsFormArray.push(this.fb.group({
        id: [input.id],
        name: [input.name, Validators.required],
        enabled: [input.enabled],
      }), { emitEvent: false });
    });

    this.onboardSettingsForm.markAsPristine(); // Reset dirty state after initial population
  }

  get digitalOutputs(): FormArray {
    return this.onboardSettingsForm.get('digitalOutputs') as FormArray;
  }

  get digitalInputs(): FormArray {
    return this.onboardSettingsForm.get('digitalInputs') as FormArray;
  }

  saveSettings(): void {
    this.onboardSettingsForm.markAllAsTouched();

    if (this.onboardSettingsForm.invalid) {
      console.log('Form is invalid, cannot save.');
      return;
    }

    if (this.onboardSettingsForm.dirty) {
      const formValue = this.onboardSettingsForm.getRawValue();

      // Update widget titles in DashboardSettingsService
      this.dashboardSettingsService.updateWidgetTitle(
        'digital-outputs',
        formValue.digitalOutputsWidgetTitle
      );
      this.dashboardSettingsService.updateWidgetTitle(
        'digital-inputs',
        formValue.digitalInputsWidgetTitle
      );

      // Directly call ConfigFileService to update digital I/O configs
      this.configFileService.updateDigitalOutputsConfig(formValue.digitalOutputs);
      this.configFileService.updateDigitalInputsConfig(formValue.digitalInputs);

      this.onboardSettingsForm.markAsPristine();
      this.savedConfirmation.set(true);
      setTimeout(() => this.savedConfirmation.set(false), 3000);
    }
  }

  resetSettings(): void {
    this.populateForm(); // Re-populate from current service state
  }

  // Helpers for template access
  getDigitalOutputControl(index: number, controlName: string): AbstractControl | null {
    return (this.digitalOutputs.at(index) as FormGroup).get(controlName);
  }

  getDigitalInputControl(index: number, controlName: string): AbstractControl | null {
    return (this.digitalInputs.at(index) as FormGroup).get(controlName);
  }

  toggleOutputEnabled(index: number): void {
    const control = (this.digitalOutputs.at(index) as FormGroup).get('enabled');
    if (control) {
      control.setValue(!control.value);
      this.onboardSettingsForm.markAsDirty();
    }
  }

  toggleInputEnabled(index: number): void {
    const control = (this.digitalInputs.at(index) as FormGroup).get('enabled');
    if (control) {
      control.setValue(!control.value);
      this.onboardSettingsForm.markAsDirty();
    }
  }
}