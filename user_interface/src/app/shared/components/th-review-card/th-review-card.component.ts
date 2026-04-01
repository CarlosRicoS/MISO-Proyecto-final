import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'th-review-card',
  templateUrl: './th-review-card.component.html',
  styleUrls: ['./th-review-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class ThReviewCardComponent {
  @Input() name = 'Guest';
  @Input() locationAndDate = 'City • Date';
  @Input() relativeDate = '2 days ago';
  @Input() text = '';
  @Input() avatarUrl = '';
  @Input() score = '5.0';
  @Input() stars = 5;

  get starsArray(): number[] {
    return Array.from({ length: Math.max(0, this.stars) }, (_, i) => i);
  }
}
