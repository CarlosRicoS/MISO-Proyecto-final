import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { ThButtonComponent } from '../th-button/th-button.component';
import { ThReviewCardComponent } from '../th-review-card/th-review-card.component';

export interface ThReviewCategoryScore {
  label: string;
  value: string;
}

export interface ThGuestReviewItem {
  name: string;
  locationAndDate: string;
  relativeDate: string;
  text: string;
  avatarUrl: string;
  score: string;
  stars: number;
}

@Component({
  selector: 'th-property-review-summary',
  templateUrl: './th-property-review-summary.component.html',
  styleUrls: ['./th-property-review-summary.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ThButtonComponent, ThReviewCardComponent],
})
export class ThPropertyReviewSummaryComponent {
  @Input() title = 'Guest Reviews';
  @Input() desktopActionLabel = 'Write a review';
  @Input() mobileActionLabel = 'See All';
  @Input() loadMoreLabel = 'Load more reviews';
  @Input() categoryScores: ThReviewCategoryScore[] = [];
  @Input() reviews: ThGuestReviewItem[] = [];

  get mobileReviews(): ThGuestReviewItem[] {
    return this.reviews.slice(0, 2);
  }
}
