import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'th-property-description-summary',
  templateUrl: './th-property-description-summary.component.html',
  styleUrls: ['./th-property-description-summary.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class ThPropertyDescriptionSummaryComponent {
  @Input() title = 'About This Hotel';
  @Input() paragraphs: string[] = [];
  @Input() mobilePreviewParagraphCount = 2;
  @Input() readMoreLabel = 'Read More';
  @Input() readLessLabel = 'Read Less';

  isExpanded = false;

  get hasMoreParagraphs(): boolean {
    return this.paragraphs.length > this.mobilePreviewParagraphCount;
  }

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
  }
}
