import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';

export interface ThAmenityItem {
  label: string;
  icon: string;
}

@Component({
  selector: 'th-amenities-summary',
  templateUrl: './th-amenities-summary.component.html',
  styleUrls: ['./th-amenities-summary.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class ThAmenitiesSummaryComponent {
  @Input() title = 'Popular Amenities';
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

  get mobileAmenities(): ThAmenityItem[] {
    return this.amenities.slice(0, 6);
  }

  get desktopViewAllText(): string {
    return `View all ${this.totalAmenities} amenities`;
  }
}
