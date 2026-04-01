import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'th-detail-summary',
  templateUrl: './th-detail-summary.component.html',
  styleUrls: ['./th-detail-summary.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class ThDetailSummaryComponent {
  @Input() title = 'Hotel name';
  @Input() location = 'City, Country';
  @Input() score = '9.2';
  @Input() scoreLabel = 'Exceptional';
  @Input() reviewsText = '1,847 reviews';
  @Input() stars = 5;
  @Input() showActions = true;

  get starIcons(): string[] {
    return Array.from({ length: Math.max(0, this.stars) }, () => 'star');
  }
}