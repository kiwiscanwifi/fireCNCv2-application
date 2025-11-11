import { ChangeDetectionStrategy, Component, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ModuleService, Port } from '../../services/module.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-edit-module-port',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './edit-module-port.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditModulePortComponent implements OnInit, OnDestroy {
  // FIX: Explicitly type `fb` as `FormBuilder` to resolve 'Property does not exist on type unknown' errors.
  private fb: FormBuilder = inject(FormBuilder);
  // FIX: Explicitly type `router` as `Router` to resolve 'Property does not exist on type unknown' errors.
  private router: Router = inject(Router);
  // FIX: Explicitly type `route` as `ActivatedRoute` to resolve 'Property does not exist on type unknown' errors.
  private route: ActivatedRoute = inject(ActivatedRoute);
  private moduleService = inject(ModuleService);
  private destroy$ = new Subject<void>();

  portForm!: FormGroup;
  
  private moduleId = this.route.snapshot.paramMap.get('moduleId');
  private portIndex = Number(this.route.snapshot.paramMap.get('portIndex'));
  
  module = computed(() => {
    if (!this.moduleId) return undefined;
    return this.moduleService.getModuleById(this.moduleId);
  });
  
  port = computed(() => {
    const mod = this.module();
    if (!mod || isNaN(this.portIndex) || this.portIndex < 0 || this.portIndex >= mod.ports.length) {
      return undefined;
    }
    return mod.ports[this.portIndex];
  });
  
  inputTypes = ['Default', 'CT Clamp'];

  ngOnInit(): void {
    const currentPort = this.port();
    const currentModule = this.module();
    if (currentPort && currentModule) {
      this.buildForm(currentModule.function, currentModule.protocol, currentPort);
    } else {
      this.router.navigate(['/settings/expansion']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private buildForm(func: string, protocol: string, portData: Port) {
    if (func === 'MPG') {
      this.portForm = this.fb.group({
        name: [{ value: portData.name, disabled: true }],
        alias: [portData.alias, Validators.required],
        enabled: [portData.enabled],
      });
    } else {
      this.portForm = this.fb.group({
        name: [portData.name, Validators.required],
        enabled: [portData.enabled],
        portReference: [portData.portReference],
        type: [portData.type],
        signal: [portData.signal],
        inputType: [portData.inputType],
        ctClampCurrent: [portData.ctClampCurrent],
        ctClampVoltage: [portData.ctClampVoltage],
        oid: [portData.oid],
        registerId: [portData.registerId],
        onValue: [portData.onValue],
        offValue: [portData.offValue],
      });
    }

    this.portForm.get('type')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateValidators());
    this.portForm.get('inputType')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateValidators());

    this.updateValidators();
  }

  updateValidators() {
    const func = this.module()?.function;
    const protocol = this.module()?.protocol;
    if (!this.portForm || !func || !protocol) return;

    const portType = this.portForm.get('type')?.value;
    const inputType = this.portForm.get('inputType')?.value;

    const setValidation = (controlName: string, validators: any[] | null) => {
        const control = this.portForm.get(controlName);
        if (control) {
            control.setValidators(validators);
            control.updateValueAndValidity({ emitEvent: false });
        }
    };
    
    // Reset all optional fields' validators
    ['type', 'signal', 'inputType', 'ctClampCurrent', 'ctClampVoltage', 'oid', 'registerId', 'onValue', 'offValue', 'portReference', 'alias'].forEach(name => setValidation(name, null));

    if (func === 'IO') {
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
    } else if (func === 'Relay') {
      setValidation('portReference', [Validators.required, Validators.min(1)]);
      if (protocol === 'MODBUS RTU') {
        setValidation('registerId', [Validators.required, Validators.min(0)]);
        setValidation('onValue', [Validators.required]);
        setValidation('offValue', [Validators.required]);
      }
    } else if (func === 'MPG') {
      setValidation('alias', [Validators.required]);
    }
  }
  
  onCancel(): void {
    this.router.navigate(['/settings/expansion']);
  }

  onSave(): void {
    if (this.portForm.invalid || !this.moduleId) {
      this.portForm.markAllAsTouched();
      return;
    }
    const newPortData: Port = this.portForm.getRawValue();
    // The 'name' control is disabled for MPG, so its value is not in getRawValue(). We need to add it back.
    const originalPort = this.port();
    if (originalPort && this.module()?.function === 'MPG') {
      newPortData.name = originalPort.name;
    }

    this.moduleService.updateModulePort(this.moduleId, this.portIndex, newPortData);
    this.router.navigate(['/settings/expansion']);
  }
}