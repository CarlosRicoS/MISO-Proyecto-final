import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { ThButtonComponent, ThButtonVariant } from '../th-button/th-button.component';

export type ThPopupVariant = 'info' | 'success' | 'warning' | 'error' | 'confirm';

@Component({
  selector: 'th-popup',
  templateUrl: './th-popup.component.html',
  styleUrls: ['./th-popup.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ThButtonComponent],
})
export class ThPopupComponent {
  @Input() isOpen = false;
  @Input() title = 'Message';
  @Input() message = '';
  @Input() variant: ThPopupVariant = 'info';

  @Input() primaryButtonText = 'OK';
  @Input() secondaryButtonText: string | null = null;

  @Input() closeOnBackdrop = true;
  @Input() closeOnEscape = true;

  @Input() iconName: string | null = null;
  @Input() hideIcon = false;

  @Input() primaryButtonVariant: ThButtonVariant | null = null;
  @Input() secondaryButtonVariant: ThButtonVariant = 'secondary';

  @Output() primaryAction = new EventEmitter<void>();
  @Output() secondaryAction = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  get hasSecondaryButton(): boolean {
    return Boolean(String(this.secondaryButtonText || '').trim());
  }

  get resolvedIconName(): string {
    if (this.iconName) {
      return this.iconName;
    }

    switch (this.variant) {
      case 'success':
        return 'checkmark-circle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'close-circle';
      case 'confirm':
        return 'help-circle';
      case 'info':
      default:
        return 'information-circle';
    }
  }

  get resolvedPrimaryButtonVariant(): ThButtonVariant {
    return this.primaryButtonVariant || 'primary';
  }

  @HostListener('window:keydown.escape')
  onEscapePressed(): void {
    if (!this.isOpen || !this.closeOnEscape) {
      return;
    }

    this.close();
  }

  onBackdropClicked(): void {
    if (!this.closeOnBackdrop) {
      return;
    }

    this.close();
  }

  onPrimaryClicked(): void {
    this.primaryAction.emit();
    this.close();
  }

  onSecondaryClicked(): void {
    this.secondaryAction.emit();
    this.close();
  }

  close(): void {
    this.closed.emit();
  }
}
