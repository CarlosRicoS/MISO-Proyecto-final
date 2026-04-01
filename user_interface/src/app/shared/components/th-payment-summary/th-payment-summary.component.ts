import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { ThButtonComponent } from '../th-button/th-button.component';

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
  imports: [CommonModule, IonicModule, ThButtonComponent],
})
export class ThPaymentSummaryComponent {
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
  @Input() guestsLabel = 'Guests';
  @Input() guestsValue = '1 Adult';
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
  @Input() footnote = "You won't be charged yet";
  @Input() trustLeftLabel = 'Secure booking';
  @Input() trustLeftIcon = 'shield-checkmark';
  @Input() trustRightLabel = 'Free cancellation';
  @Input() trustRightIcon = 'refresh-circle';
  @Input() mobileSticky = false;
  @Input() compactSuffix = '/night';
  @Input() compactNote = 'Taxes and fees included';
}
