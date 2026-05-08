import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { TranslateModule } from '@ngx-translate/core';

export type ThDetailSummaryStatusVariant =
  | 'default'
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'rejected'
  | 'canceled';

@Component({
  selector: 'th-detail-summary',
  templateUrl: './th-detail-summary.component.html',
  styleUrls: ['./th-detail-summary.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, TranslateModule],
})
export class ThDetailSummaryComponent {
  @Input() title = '';
  @Input() location = '';
  @Input() score = '';
  @Input() scoreLabel = '';
  @Input() reviewsText = '';
  @Input() stars = 5;
  @Input() showActions = true;
  @Input() showSaveAction = true;
  @Input() showShareAction = true;
  @Input() showRatingRow = true;
  @Input() statusText = '';
  @Input() statusVariant: ThDetailSummaryStatusVariant = 'default';
  @Input() metaPrimary = '';
  @Input() metaSecondary = '';
  @Input() isCheckInAvailable: boolean | null = null;
  @Input() isCheckInSubmitting: boolean | null = null;
  @Input() bookingStatus = '';

  isPlatformNative = Capacitor.isNativePlatform();

  get isBookingConfirmed(): boolean {
    return this.bookingStatus?.trim().toUpperCase() === 'CONFIRMED';
  }

  get hasBookingMeta(): boolean {
    return Boolean(this.metaPrimary || this.metaSecondary);
  }

  get starIcons(): string[] {
    return Array.from({ length: Math.max(0, this.stars) }, () => 'star');
  }

  @Output() checkin = new EventEmitter<void>();

  onCheckinClick(): void {
    this.checkin.emit();
  }
}