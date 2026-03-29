import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output  } from '@angular/core';
import { IonicModule } from '@ionic/angular';

export type ThInputState = 'default' | 'focus' | 'error' | 'disabled';
export type ThInputType = 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search';

@Component({
  selector: 'th-input',
  templateUrl: './th-input.component.html',
  styleUrls: ['./th-input.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ThInputComponent {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() value = '';
  @Input() type: ThInputType = 'text';
  @Input() startIcon = '';
  @Input() endIcon = '';
  @Input() endIconAriaLabel = 'Input action';
  @Input() helper = '';
  @Input() badge = '';
  @Input() state: ThInputState = 'default';
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string>();
  @Output() endIconClick = new EventEmitter<void>();
  isFocused = false;

  get stateClass(): string {
    if (this.disabled || this.state === 'disabled') {
      return 'th-input--disabled';
    }

    if (this.state === 'error') {
      return 'th-input--error';
    }

    if (this.state === 'focus' || this.isFocused) {
      return 'th-input--focus';
    }

    return 'th-input--default';
  }

  get isDisabled(): boolean {
    return this.disabled || this.state === 'disabled';
  }

  onFocus(): void {
    this.isFocused = true;
  }

  onBlur(): void {
    this.isFocused = false;
  }

  onInput(event: Event): void {
    const customEvent = event as CustomEvent<{ value: string | null }>;
    this.valueChange.emit(customEvent.detail.value ?? '');
  }

  onEndIconClick(event: Event): void {
    event.stopPropagation();
    if (this.isDisabled) {
      return;
    }
    this.endIconClick.emit();
  }
}
