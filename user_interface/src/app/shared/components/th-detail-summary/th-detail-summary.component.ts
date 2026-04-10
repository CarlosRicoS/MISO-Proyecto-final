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
  @Input() title = '';
  @Input() location = '';
  @Input() score = '';
  @Input() scoreLabel = '';
  @Input() reviewsText = '';
  @Input() stars = 5;
  @Input() showActions = true;

  get starIcons(): string[] {
    return Array.from({ length: Math.max(0, this.stars) }, () => 'star');
  }
}