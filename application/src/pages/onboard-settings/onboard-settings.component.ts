import { ChangeDetectionStrategy, Component, inject, OnInit, OnDestroy, signal, WritableSignal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators, AbstractControl } from '@angular/forms';
import { DashboardSettingsService, DigitalOutputConfig, DigitalInputConfig } from '../../services/dashboard-settings.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
// FIX: Import ReactiveFormsModule
import { ReactiveFormsModule } from '@angular/forms';
import { ConfigManagementService } from '../../services/config-management.service'; // NEW
import { ArduinoService } from '../../services/arduino.service'; // NEW: Import ArduinoService
import { NotificationService } from '../../services/notification.service'; // NEW

@Component({
  selector: 'app-onboard-settings',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './onboard-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardSettingsComponent implements OnDestroy {
  // FIX: Explicitly type `fb` as `FormBuilder` to resolve 'Property does not exist on type unknown' errors.
  private fb: FormBuilder = inject(FormBuilder);
  private dashboardSettingsService = inject(DashboardSettingsService);
  private configManagementService = inject(ConfigManagementService); // NEW
  private arduinoService = inject(ArduinoService); // NEW: Import ArduinoService
  private notificationService = inject(NotificationService); // NEW
  private destroy$ = new Subject<void>();

  onboardSettingsForm!: FormGroup;

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
    const outputsWidget = currentLayout.COLUMN1.find(w => w.ID === 'digital-outputs') ||
                          currentLayout.COLUMN2.find(w => w.ID === 'digital-outputs');
    const currentOutputsTitle = outputsWidget?.TITLE || 'Digital Outputs (8-DO)'; // Fallback to default

    // Find current widget titles from the dashboard layout for digital inputs
    const inputsWidget = currentLayout.COLUMN1.find(w => w.ID === 'digital-inputs') ||
                         currentLayout.COLUMN2.find(w => w.ID === 'digital-inputs');
    const currentInputsTitle = inputsWidget?.TITLE || 'Digital Inputs (8-DI)'; // Fallback to default

    // Patch the new form controls with the current widget titles
    this.digitalOutputsWidgetTitle.setValue(currentOutputsTitle, { emitEvent: false });
    this.digitalInputsWidgetTitle.setValue(currentInputsTitle, { emitEvent: false });

    const digitalOutputsFormArray = this.onboardSettingsForm.get('digitalOutputs') as FormArray;
    digitalOutputsFormArray.clear({ emitEvent: false }); // Clear existing controls
    outputs.forEach(output => {
      digitalOutputsFormArray.push(this.fb.group({
        ID: [output.ID],
        NAME: [output.NAME, Validators.required],
        ENABLED: [output.ENABLED],
      }), { emitEvent: false });
    });

    const digitalInputsFormArray = this.onboardSettingsForm.get('digitalInputs') as FormArray;
    digitalInputsFormArray.clear({ emitEvent: false }); // Clear existing controls
    inputs.forEach(input => {
      digitalInputsFormArray.push(this.fb.group({
        ID: [input.ID],
        NAME: [input.NAME, Validators.required],
        ENABLED: [input.ENABLED],
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

  async saveSettings(): Promise<void> {
    this.onboardSettingsForm.markAllAsTouched();
    this.notificationService.clearAll();

    if (this.onboardSettingsForm.invalid) {
      console.log('Form is invalid, cannot save.');
      this.notificationService.showError('Onboard I/O settings could not be saved. Please correct errors.');
      return;
    }

    if (this.onboardSettingsForm.dirty) {
      const formValue = this.onboardSettingsForm.getRawValue();
      
      // Stage I/O config changes
      this.configManagementService.updateDigitalOutputsConfig(formValue.digitalOutputs);
      this.configManagementService.updateDigitalInputsConfig(formValue.digitalInputs);
      
      // Stage dashboard layout changes (for titles)
      let layout = JSON.parse(JSON.stringify(this.dashboardSettingsService.layout()));
      const updateTitle = (id: string, newTitle: string) => {
        layout.COLUMN1.forEach((w: any) => { if (w.ID === id) w.TITLE = newTitle; });
        layout.COLUMN2.forEach((w: any) => { if (w.ID === id) w.TITLE = newTitle; });
      };
      updateTitle('digital-outputs', formValue.digitalOutputsWidgetTitle);
      updateTitle('digital-inputs', formValue.digitalInputsWidgetTitle);
      this.configManagementService.updateDashboardLayout(layout);

      // Commit all staged changes
      await this.configManagementService.commitChanges();
      this.onboardSettingsForm.markAsPristine();
    }
  }

  resetSettings(): void {
    this.configManagementService.discardChanges();
    this.populateForm(); // Re-populate from current service state
    this.notificationService.clearAll(); // NEW: Clear all notifications
  }

  // Helpers for template access
  getDigitalOutputControl(index: number, controlName: string): AbstractControl | null {
    return (this.digitalOutputs.at(index) as FormGroup).get(controlName);
  }

  getDigitalInputControl(index: number, controlName: string): AbstractControl | null {
    return (this.digitalInputs.at(index) as FormGroup).get(controlName);
  }

  toggleOutputEnabled(index: number): void {
    const control = (this.digitalOutputs.at(index) as FormGroup).get('ENABLED');
    if (control) {
      control.setValue(!control.value);
      this.onboardSettingsForm.markAsDirty();
    }
  }

  toggleInputEnabled(index: number): void {
    const control = (this.digitalInputs.at(index) as FormGroup).get('ENABLED');
    if (control) {
      control.setValue(!control.value);
      this.onboardSettingsForm.markAsDirty();
    }
  }
}
