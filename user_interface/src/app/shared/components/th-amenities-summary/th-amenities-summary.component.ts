import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';

export interface ThAmenityItem {
  label: string;
  icon: string;
}

@Component({
  selector: 'th-amenities-summary',
  templateUrl: './th-amenities-summary.component.html',
  styleUrls: ['./th-amenities-summary.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, TranslateModule],
})
export class ThAmenitiesSummaryComponent implements OnDestroy, OnInit {
  private destroy$ = new Subject<void>();

  @Input() title: string | null = 'Popular Amenities';
  @Input() amenities: ThAmenityItem[] = [
    { label: 'Free WiFi', icon: 'wifi-outline' },
    { label: 'Pool', icon: 'water-outline' },
    { label: 'Restaurant', icon: 'restaurant-outline' },
    { label: 'Spa', icon: 'flower-outline' },
    { label: 'Gym', icon: 'barbell-outline' },
    { label: 'Parking', icon: 'car-outline' },
  ];
  @Input() totalAmenities = 32;
  @Input() viewAllLabel = 'View all amenities';

  constructor(private translate: TranslateService) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    if (!this.title || this.title === 'Popular Amenities') {
      this.title = this.translate.instant('PROPERTY.POPULAR_AMENITIES');
    }
  }

  

  get mobileAmenities(): ThAmenityItem[] {
    return this.amenities.slice(0, 6);
  }

  get desktopViewAllText(): string {
    const viewAll = this.viewAllLabel || 'View all';
    const trimmed = viewAll.trim();

    // If label contains a count placeholder, replace it
    if (/{\{?\s*count\s*\}?}|%d/.test(trimmed)) {
      return trimmed.replace(/\{\{\s*count\s*\}\}|\{count\}|%d/, String(this.totalAmenities));
    }

    // If the label ends with the word 'amenities', insert the count before it
    if (/amenities\s*$/i.test(trimmed)) {
      return trimmed.replace(/amenities\s*$/i, `${this.totalAmenities} amenities`);
    }

    return `${trimmed} ${this.totalAmenities}`;
  }
}
