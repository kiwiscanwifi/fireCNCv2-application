import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ModuleService } from '../../services/module.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-create-module-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-module.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateModulePageComponent implements OnDestroy {
  // FIX: Explicitly type `fb` as `FormBuilder` to resolve 'Property does not exist on type unknown' errors.
  private fb: FormBuilder = inject(FormBuilder);
  // FIX: Explicitly type `router` as `Router` to resolve 'Property 'navigate' does not exist on type unknown' errors.
  private router: Router = inject(Router);
  private moduleService = inject(ModuleService);
  private destroy$ = new Subject<void>();

  moduleForm: FormGroup;

  urlPattern = /^(https|http):\/\/[^\s$.?#].[^\s]*$/;
  semverPattern = /^\d+\.\d+\.\d+$/;

  deviceFunctions = ['IO', 'Relay', 'Spindle', 'MPG'];
  allProtocols = ['MODBUS RTU', 'MODBUS TCP', 'EtherCAT', 'CANopen', 'LinuxCNC API', 'OTHER'];
  inputTypes = ['Default', 'CT Clamp'];

  protocols = computed(() => {
    const selectedFunction = this.moduleForm.get('function')?.value;
    if (selectedFunction === 'MPG') {
      return ['LinuxCNC API'];
    }
    return this.allProtocols.filter(p => p !== 'OTHER');
  });

  constructor() {
    this.moduleForm = this.fb.group({
      moduleName: ['', Validators.required],
      version: ['1.0.0', [Validators.required, Validators.pattern(this.semverPattern)]],
      author: ['', Validators.required],
      function: ['IO', Validators.required],
      protocol: ['MODBUS RTU', Validators.required],
      description: [''],
      infoUrl: ['', [Validators.pattern(this.urlPattern)]],
      imageUrl: ['', [Validators.pattern(this.urlPattern)]],
      displayOnStatusPage: [true],
      displayOnDashboard: [false],
      ports: this.fb.array([]),
    });

    this.moduleForm.get('function')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((func) => {
      const protocolControl = this.moduleForm.get('protocol');
      this.ports.clear(); // Clear ports for any function change
    
      if (func === 'MPG') {
        protocolControl?.setValue('LinuxCNC API', { emitEvent: false });
        this.moduleForm.get('displayOnStatusPage')?.setValue(false, { emitEvent: false });
        this.moduleForm.get('displayOnDashboard')?.setValue(true, { emitEvent: false });
    
        const axes = [
            { key: 'X', defaultAlias: 'X Axis' },
            { key: 'Y', defaultAlias: 'Y Axis' },
            { key: 'Z', defaultAlias: 'Z Axis' },
            { key: 'A', defaultAlias: 'A Axis (Rotary)' },
            { key: 'B', defaultAlias: 'B Axis (Rotary)' },
            { key: 'C', defaultAlias: 'C Axis (Rotary)' },
        ];
        const defaultEnabled = ['X', 'Y', 'Z'];
        axes.forEach(axis => {
          const portGroup = this.fb.group({
            name: [axis.key], // Immutable identifier
            alias: [axis.defaultAlias, Validators.required], // Editable display name
            enabled: [defaultEnabled.includes(axis.key)]
          });
          this.ports.push(portGroup);
        });
      } else {
        this.moduleForm.get('displayOnDashboard')?.setValue(false, { emitEvent: false });
        // Reset protocol if it was LinuxCNC API
        if (protocolControl?.value === 'LinuxCNC API') {
          protocolControl?.setValue('MODBUS RTU', { emitEvent: false });
        }
      }
      this.updateAllPortValidators();
    });

    this.moduleForm.get('protocol')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.updateAllPortValidators();
    });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get ports(): FormArray {
    return this.moduleForm.get('ports') as FormArray;
  }

  get sortedPorts() {
    return (this.ports.controls as FormGroup[])
      .map((control, index) => ({ control, originalIndex: index }))
      .sort((a, b) => {
        const refA = a.control.get('portReference')?.value ?? Infinity;
        const refB = b.control.get('portReference')?.value ?? Infinity;
        return refA - refB;
      });
  }

  addPort(): void {
    const portGroup = this.fb.group({
      name: ['', Validators.required],
      enabled: [true],
      portReference: [this.ports.length + 1],
      type: ['output'],
      signal: ['digital'],
      inputType: ['Default'],
      ctClampCurrent: [null],
      ctClampVoltage: [null],
      oid: [''],
      registerId: [null],
      onValue: [null],
      offValue: [null],
    });

    portGroup.get('type')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.updatePortValidators(portGroup));
    portGroup.get('inputType')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.updatePortValidators(portGroup));

    this.ports.push(portGroup);
    this.updatePortValidators(portGroup);
  }
  
  updateAllPortValidators(): void {
    this.ports.controls.forEach(control => this.updatePortValidators(control as FormGroup));
  }

  updatePortValidators(portGroup: FormGroup): void {
    const functionType = this.moduleForm.get('function')?.value;
    const protocol = this.moduleForm.get('protocol')?.value;
    const portType = portGroup.get('type')?.value;
    const inputType = portGroup.get('inputType')?.value;

    // Helper to set/clear validators
    const setValidation = (controlName: string, validators: any[] | null) => {
        const control = portGroup.get(controlName);
        if (control) {
            control.setValidators(validators);
            control.updateValueAndValidity({ emitEvent: false });
        }
    };

    // Reset optional fields' validators
    ['type', 'signal', 'inputType', 'ctClampCurrent', 'ctClampVoltage', 'oid', 'registerId', 'onValue', 'offValue', 'portReference'].forEach(name => setValidation(name, null));

    if (functionType === 'IO') {
      setValidation('type', [Validators.required]);
      setValidation('signal', [Validators.required]);
      if (portType === 'input') {
        setValidation('inputType', [Validators.required]);
        if (protocol === 'MODBUS RTU') {
          setValidation('registerId', [Validators.required, Validators.min(0)]);
        }
        if (inputType === 'CT Clamp') {
          setValidation('ctClampCurrent', [Validators.required, Validators.min(0)]);
          setValidation('ctClampVoltage', [Validators.required, Validators.min(0)]);
        }
      }
    } else if (functionType === 'Relay') {
      setValidation('portReference', [Validators.required, Validators.min(1)]);
      if (protocol === 'MODBUS RTU') {
        setValidation('registerId', [Validators.required, Validators.min(0)]);
        setValidation('onValue', [Validators.required]);
        setValidation('offValue', [Validators.required]);
      }
    }
  }

  removePort(index: number): void {
    this.ports.removeAt(index);
  }

  onCancel(): void {
    this.router.navigate(['/settings/expansion']);
  }

  onSave(): void {
    if (this.moduleForm.invalid) {
      this.moduleForm.markAllAsTouched();
      return;
    }
    const formValue = this.moduleForm.getRawValue();
    const fileName = formValue.moduleName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/[\s-]+/g, '-') + '.json';
    
    let finalPorts;

    if (formValue.function === 'MPG') {
      finalPorts = formValue.ports.map((port: { name: string; alias: string; enabled: boolean; }) => ({
        name: port.name,
        alias: port.alias,
        enabled: port.enabled,
      }));
    } else {
      finalPorts = formValue.ports.map((port: any) => {
        const cleanPort: any = {
          name: port.name,
          enabled: port.enabled,
        };
        if (formValue.function === 'IO') {
          cleanPort.type = port.type;
          cleanPort.signal = port.signal;
          if (port.type === 'input') {
            cleanPort.inputType = port.inputType;
            if (formValue.protocol === 'MODBUS RTU') cleanPort.registerId = port.registerId;
            if (port.inputType === 'CT Clamp') {
              cleanPort.ctClampCurrent = port.ctClampCurrent;
              cleanPort.ctClampVoltage = port.ctClampVoltage;
            }
          }
        } else if (formValue.function === 'Relay') {
          cleanPort.portReference = port.portReference;
          if(port.oid) cleanPort.oid = port.oid;
          if (formValue.protocol === 'MODBUS RTU') {
            cleanPort.registerId = port.registerId;
            cleanPort.onValue = port.onValue;
            cleanPort.offValue = port.offValue;
          }
        }
        return cleanPort;
      });
    }
    
    const finalModule = { ...formValue, ports: finalPorts };
    if (formValue.function === 'MPG') {
        finalModule.displayOnStatusPage = false;
    }
    
    const jsonContent = JSON.stringify(finalModule, null, 2);

    this.moduleService.addModuleFile(fileName, jsonContent);
    this.moduleService.installModule(fileName);
    this.router.navigate(['/settings/expansion']);
  }
}