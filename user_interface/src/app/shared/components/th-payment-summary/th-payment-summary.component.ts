import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { ThButtonComponent } from '../th-button/th-button.component';
import { ThDatetimeModalComponent } from '../th-datetime-modal/th-datetime-modal.component';

export interface ThPaymentSummaryItem {
  label: string;
  amount: string;
  description?: string;
  muted?: boolean;
}

export interface ThPaymentSummaryBadge {
  text: string;
  variant: 'success' | 'warning' | 'error' | 'info' | 'rating' | 'neutral';
  icon?: string;
}

@Component({
  selector: 'th-payment-summary',
  templateUrl: './th-payment-summary.component.html',
  styleUrls: ['./th-payment-summary.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ThButtonComponent, ThDatetimeModalComponent],
})
export class ThPaymentSummaryComponent implements OnChanges {
  @Input() title = '$299';
  @Input() subtitle = 'per night';
  @Input() promoText = 'Save 15% with our winter special';
  @Input() promoIcon = 'pricetag';
  @Input() checkInLabel = 'Check-in';
  @Input() checkInValue = '2024-12-20';
  @Input() checkInIcon = 'calendar-outline';
  @Input() checkOutLabel = 'Check-out';
  @Input() checkOutValue = '2024-12-23';
  @Input() checkOutIcon = 'calendar-outline';
  @Input() checkInPlaceholder = 'mm/dd/yyyy';
  @Input() checkOutPlaceholder = 'mm/dd/yyyy';
  @Input() guestsLabel = 'Guests';
  @Input() guestsValue = '1';
  @Input() guestsPlaceholder = '1 Guest';
  @Input() guestsIcon = 'chevron-down-outline';
  @Input() roomTypeLabel = 'Room Type';
  @Input() roomTypeValue = 'Standard Room';
  @Input() roomTypeIcon = 'chevron-down-outline';
  @Input() items: ThPaymentSummaryItem[] = [
    {
      label: 'Room (3 nights)',
      amount: '$540',
      description: 'Standard room',
    },
    {
      label: 'Service fee',
      amount: '$22',
      muted: true,
    },
    {
      label: 'Taxes',
      amount: '$48',
      description: 'Includes VAT',
      muted: true,
    },
  ];
  @Input() badges: ThPaymentSummaryBadge[] = [
    { text: 'Free cancellation', variant: 'success', icon: 'checkmark-circle' },
    { text: 'Taxes included', variant: 'info', icon: 'receipt-outline' },
  ];
  @Input() totalLabel = 'Total';
  @Input() totalAmount = '$610';
  @Input() actionLabel = 'Confirm and pay';
  @Input() actionDisabled = false;
  @Input() footnote = "You won't be charged yet";
  @Input() trustLeftLabel = 'Secure booking';
  @Input() trustLeftIcon = 'shield-checkmark';
  @Input() trustRightLabel = 'Free cancellation';
  @Input() trustRightIcon = 'refresh-circle';
  @Input() mobileSticky = false;
  @Input() editable = true;
  @Input() editorResetTrigger: number | string | null = null;
  @Input() compactSuffix = '/night';
  @Input() compactNote = 'Taxes and fees included';

  @Output() checkInValueChange = new EventEmitter<string>();
  @Output() checkOutValueChange = new EventEmitter<string>();
  @Output() guestsValueChange = new EventEmitter<string>();
  @Output() actionClick = new EventEmitter<void>();

  @Input() checkInError = '';
  @Input() checkOutError = '';
  @Input() guestsError = '';
  @Input() isLoading = false;

  isMobileEditorOpen = false;

  showCheckInModal = false;
  showCheckOutModal = false;
  tempDate: string | null = null;
  readonly checkInMinDate = this.getTodayIsoDate();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['guestsValue']) {
      this.guestsValue = this.sanitizeGuestsValue(this.guestsValue);
    }

    if ((changes['mobileSticky'] || changes['editable']) && (!this.mobileSticky || !this.editable)) {
      this.isMobileEditorOpen = false;
    }

    if (changes['editorResetTrigger'] && this.mobileSticky) {
      this.isMobileEditorOpen = false;
    }

    if ((changes['checkInError'] || changes['checkOutError'] || changes['guestsError']) && this.mobileSticky) {
      const hasErrors = Boolean(this.checkInError || this.checkOutError || this.guestsError);
      if (hasErrors) {
        this.isMobileEditorOpen = true;
      }
    }
  }

  toggleMobileEditor(): void {
    this.isMobileEditorOpen = !this.isMobileEditorOpen;
  }

  onCheckInActivated(): void {
    this.tempDate = this.convertDDMMYYYYToISO(this.checkInValue);
    this.showCheckInModal = true;
  }

  onCheckOutActivated(): void {
    this.tempDate = this.convertDDMMYYYYToISO(this.checkOutValue);
    this.showCheckOutModal = true;
  }

  onCheckInConfirmed(date: Date): void {
    this.checkInValue = this.convertDateToDDMMYYYY(date);
    this.checkInValueChange.emit(this.checkInValue);

    if (!this.checkOutValue.trim()) {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      this.checkOutValue = this.convertDateToDDMMYYYY(nextDay);
      this.checkOutValueChange.emit(this.checkOutValue);
    }

    this.showCheckInModal = false;
    this.tempDate = null;
  }

  onCheckOutConfirmed(date: Date): void {
    this.checkOutValue = this.convertDateToDDMMYYYY(date);
    this.checkOutValueChange.emit(this.checkOutValue);
    this.showCheckOutModal = false;
    this.tempDate = null;
  }

  onCheckInCancelled(): void {
    this.showCheckInModal = false;
    this.tempDate = null;
  }

  onCheckOutCancelled(): void {
    this.showCheckOutModal = false;
    this.tempDate = null;
  }

  onGuestsInput(value: string | null | undefined): void {
    const sanitized = this.sanitizeGuestsValue(value ?? '');
    this.guestsValue = sanitized;
    this.guestsValueChange.emit(sanitized);
  }

  onActionClicked(): void {
    if (this.mobileSticky && (this.checkInError || this.checkOutError || this.guestsError)) {
      this.isMobileEditorOpen = true;
    }

    this.actionClick.emit();
  }

  convertDDMMYYYYToISO(ddmmyyyy: string): string | null {
    const parts = ddmmyyyy.split('/');
    if (parts.length !== 3) {
      return null;
    }

    const [day, month, year] = parts;
    return `${year}-${month}-${day}`;
  }

  private getTodayIsoDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private convertDateToDDMMYYYY(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private sanitizeGuestsValue(value: string): string {
    return value.replace(/\D+/g, '');
  }
}
