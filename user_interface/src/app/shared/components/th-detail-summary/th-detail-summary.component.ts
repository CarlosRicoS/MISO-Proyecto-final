import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';

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
  imports: [CommonModule, IonicModule],
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

  get hasBookingMeta(): boolean {
    return Boolean(this.metaPrimary || this.metaSecondary);
  }

  get starIcons(): string[] {
    return Array.from({ length: Math.max(0, this.stars) }, () => 'star');
  }
}