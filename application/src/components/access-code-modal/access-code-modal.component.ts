import { ChangeDetectionStrategy, Component, input, output, inject, signal, WritableSignal, ElementRef, ViewChildren, QueryList, OnInit, AfterViewInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-access-code-modal',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './access-code-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessCodeModalComponent implements OnInit, AfterViewInit, OnDestroy {
  title = input<string>('Enter Access Code');
  message = input<string>('Access advanced admin features and settings.');
  loginError = input<string | null>(null); // Input for error message from parent component

  login = output<string>();
  close = output<void>();

  private fb = inject(FormBuilder);

  accessCodeForm: FormGroup;
  displayError: WritableSignal<string | null> = signal(null); // NEW: Local signal for error display

  @ViewChildren('codeInputs') codeInputRefs!: QueryList<ElementRef<HTMLInputElement>>;

  private destroy$ = new Subject<void>();

  constructor() {
    this.accessCodeForm = this.fb.group({
      code1: ['', [Validators.required, Validators.pattern(/^\d{1}$/)]],
      code2: ['', [Validators.required, Validators.pattern(/^\d{1}$/)]],
      code3: ['', [Validators.required, Validators.pattern(/^\d{1}$/)]],
      code4: ['', [Validators.required, Validators.pattern(/^\d{1}$/)]],
    });

    // NEW: Effect to keep local displayError in sync with input loginError
    effect(() => {
      this.displayError.set(this.loginError());
    });
  }

  ngOnInit(): void {
    this.accessCodeForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(values => {
      // Automatically attempt login if all fields are filled and valid
      const allFilled = Object.values(values).every(val => val && String(val).length === 1);
      if (this.accessCodeForm.valid && allFilled) {
        this.onLogin();
      }
    });
  }

  ngAfterViewInit(): void {
    // Focus the first input field after the view is initialized
    Promise.resolve().then(() => this.codeInputRefs.first?.nativeElement.focus());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  handleInput(event: Event, index: number): void {
    const inputElement = event.target as HTMLInputElement;
    const value = inputElement.value;

    // Ensure only one digit is accepted
    if (value.length > 1) {
      inputElement.value = value.charAt(0);
      // Manually update the form control if input element's value was truncated
      const controlName = `code${index + 1}`;
      this.accessCodeForm.get(controlName)?.setValue(inputElement.value, { emitEvent: false });
    }

    // Auto-focus next input if current is filled and not the last one
    if (inputElement.value.length === 1 && index < this.codeInputRefs.length - 1) {
      this.codeInputRefs.get(index + 1)?.nativeElement.focus();
    }
  }

  handleKeydown(event: KeyboardEvent, index: number): void {
    const inputElement = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && inputElement.value === '' && index > 0) {
      event.preventDefault(); // Prevent default backspace behavior (e.g., in some browsers it might delete previous char)
      this.codeInputRefs.get(index - 1)?.nativeElement.focus();
    }
    // Restrict non-numeric input
    if (!/^\d$/.test(event.key) && event.key !== 'Backspace' && event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Tab') {
       event.preventDefault();
    }
  }

  // NEW: Method to clear the local display error
  clearDisplayError(): void {
    this.displayError.set(null);
  }

  onLogin(): void {
    const { code1, code2, code3, code4 } = this.accessCodeForm.getRawValue();
    const fullCode = `${code1}${code2}${code3}${code4}`;

    if (this.accessCodeForm.valid) {
      this.login.emit(fullCode);
    } 
    // The loginError input will now be set by the parent component on failure.
    // The effect will then update displayError.
  }

  onClose(): void {
    this.close.emit();
    this.accessCodeForm.reset();
    this.displayError.set(null); // Clear local display error when modal closes
  }
}