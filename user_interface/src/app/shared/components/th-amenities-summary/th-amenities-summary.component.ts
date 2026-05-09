import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
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
export class ThAmenitiesSummaryComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  @Input() title: string | null = null;
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  

  get mobileAmenities(): ThAmenityItem[] {
    return this.amenities.slice(0, 6);
  }

  get desktopViewAllText(): string {
    const viewAll = this.viewAllLabel || 'View all';
    return `${viewAll} ${this.totalAmenities}`;
  }
}
