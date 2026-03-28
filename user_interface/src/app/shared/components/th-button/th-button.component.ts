import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';

export type ThButtonVariant =
  | 'primary'
  | 'secondary'
  | 'text'
  | 'success'
  | 'danger';

export type ThButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'th-button',
  templateUrl: './th-button.component.html',
  styleUrls: ['./th-button.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ThButtonComponent {
  @Input() variant: ThButtonVariant = 'primary';
  @Input() size: ThButtonSize = 'md';
  @Input() expand: 'block' | 'full' | undefined;
  @Input() disabled = false;

  get buttonClasses(): string[] {
    return [
      'th-button',
      `th-button--${this.variant}`,
      `th-button--${this.size}`,
      this.disabled ? 'th-button--disabled' : ''
    ].filter(Boolean);
  }
}
