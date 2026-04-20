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

export interface ThPaymentSummaryCompactTab {
  id: string;
  label: string;
}

export type ThPaymentSummaryVariant = 'default' | 'admin';

@Component({
  selector: 'th-payment-summary',
  templateUrl: './th-payment-summary.component.html',
  styleUrls: ['./th-payment-summary.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ThButtonComponent, ThDatetimeModalComponent],
})
export class ThPaymentSummaryComponent implements OnChanges {
  @Input() variant: ThPaymentSummaryVariant = 'default';
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
  @Input() showAction = true;
  @Input() compactShowSecondaryAction = false;
  @Input() compactSecondaryActionLabel = '';
  @Input() compactSecondaryActionDisabled = false;
  @Input() compactSecondaryActionLoading = false;
  @Input() compactTabs: ThPaymentSummaryCompactTab[] = [];
  @Input() compactActiveTabId = '';
  @Input() hideAfterTotal = false;
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
  @Input() adminAcceptLabel = 'Accept';
  @Input() adminRejectLabel = 'Reject';
  @Input() adminActionsDisabled = false;
  @Input() adminAcceptDisabled = false;
  @Input() adminRejectDisabled = false;

  @Output() checkInValueChange = new EventEmitter<string>();
  @Output() checkOutValueChange = new EventEmitter<string>();
  @Output() guestsValueChange = new EventEmitter<string>();
  @Output() actionClick = new EventEmitter<void>();
  @Output() compactSecondaryActionClick = new EventEmitter<void>();
  @Output() compactTabChange = new EventEmitter<string>();
  @Output() adminAcceptClick = new EventEmitter<void>();
  @Output() adminRejectClick = new EventEmitter<void>();

  @Input() checkInError = '';
  @Input() checkOutError = '';
  @Input() guestsError = '';
  @Input() isLoading = false;

  isMobileEditorOpen = false;

  showCheckInModal = false;
  showCheckOutModal = false;
  tempDate: string | null = null;
  readonly checkInMinDate = this.getTodayIsoDate();

  get checkOutMinDate(): string {
    const todayIso = this.getTodayIsoDate();
    const checkInIso = this.convertDDMMYYYYToISO(this.checkInValue) || this.checkInMinDate;
    
    // Parse both dates properly to avoid timezone issues
    const today = this.parseIsoDateToLocal(todayIso);
    const checkIn = this.parseIsoDateToLocal(checkInIso);
    
    // Get the later date and add 1 day
    const laterDate = today > checkIn ? today : checkIn;
    laterDate.setDate(laterDate.getDate() + 1);
    
    return this.convertDateToISO(laterDate);
  }

  get isAdminVariant(): boolean {
    return this.variant === 'admin';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['guestsValue']) {
      this.guestsValue = this.sanitizeGuestsValue(this.guestsValue);
    }

    if (changes['mobileSticky'] && !this.mobileSticky) {
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
    if (this.isAdminVariant) {
      return;
    }

    this.tempDate = this.convertDDMMYYYYToISO(this.checkInValue);
    this.showCheckInModal = true;
  }

  onCheckOutActivated(): void {
    if (this.isAdminVariant) {
      return;
    }

    this.tempDate = this.convertDDMMYYYYToISO(this.checkOutValue);
    this.showCheckOutModal = true;
  }

  onCheckInConfirmed(date: Date): void {
    this.checkInValue = this.convertDateToISO(date);
    this.checkInValueChange.emit(this.checkInValue);

    const selectedCheckInIso = this.convertDateToISO(date);
    const currentCheckOutIso = this.convertDDMMYYYYToISO(this.checkOutValue);
    if (!currentCheckOutIso || currentCheckOutIso <= selectedCheckInIso) {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      this.checkOutValue = this.convertDateToISO(nextDay);
      this.checkOutValueChange.emit(this.checkOutValue);
    }

    this.showCheckInModal = false;
    this.tempDate = null;
  }

  onCheckOutConfirmed(date: Date): void {
    this.checkOutValue = this.convertDateToISO(date);
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
    if (this.isAdminVariant) {
      return;
    }

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

  onCompactSecondaryActionClicked(): void {
    if (this.compactSecondaryActionDisabled || this.compactSecondaryActionLoading) {
      return;
    }

    this.compactSecondaryActionClick.emit();
  }

  onCompactTabSelected(tabId: string): void {
    if (!tabId || tabId === this.compactActiveTabId) {
      return;
    }

    this.compactTabChange.emit(tabId);
  }

  onAdminAcceptClicked(): void {
    if (this.adminActionsDisabled || this.adminAcceptDisabled || this.isLoading) {
      return;
    }

    this.adminAcceptClick.emit();
  }

  onAdminRejectClicked(): void {
    if (this.adminActionsDisabled || this.adminRejectDisabled || this.isLoading) {
      return;
    }

    this.adminRejectClick.emit();
  }

  convertDDMMYYYYToISO(ddmmyyyy: string): string | null {
    const trimmedValue = String(ddmmyyyy || '').trim();
    if (!trimmedValue) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
      return trimmedValue;
    }

    const parts = trimmedValue.split('/');
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

  private convertDateToISO(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  }

  private getNextDayIsoDate(isoDate: string): string {
    const parsedDate = new Date(isoDate);
    if (Number.isNaN(parsedDate.getTime())) {
      const fallback = new Date();
      fallback.setDate(fallback.getDate() + 1);
      return this.convertDateToISO(fallback);
    }

    parsedDate.setDate(parsedDate.getDate() + 1);
    return this.convertDateToISO(parsedDate);
  }

  private parseIsoDateToLocal(isoDate: string): Date {
    const [year, month, day] = isoDate.split('-');
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  private sanitizeGuestsValue(value: string): string {
    return value.replace(/\D+/g, '');
  }
}
