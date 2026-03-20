import { Component, Input } from '@angular/core';

export type ThInputState = 'default' | 'focus' | 'error' | 'disabled';

@Component({
  selector: 'th-input',
  templateUrl: './th-input.component.html',
  styleUrls: ['./th-input.component.scss'],
  standalone: false
})
export class ThInputComponent {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() value = '';
  @Input() helper = '';
  @Input() badge = '';
  @Input() state: ThInputState = 'default';
  @Input() disabled = false;

  get stateClass(): string {
    if (this.disabled || this.state === 'disabled') {
      return 'th-input--disabled';
    }

    return `th-input--${this.state}`;
  }

  get isDisabled(): boolean {
    return this.disabled || this.state === 'disabled';
  }
}
