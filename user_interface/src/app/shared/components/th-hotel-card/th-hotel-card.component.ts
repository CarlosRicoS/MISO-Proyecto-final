import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { ThBadgeComponent } from '../th-badge/th-badge.component';
import { ThButtonComponent } from '../th-button/th-button.component';

export type ThHotelCardVariant = 'compact' | 'list' | 'mobile';

@Component({
  selector: 'th-hotel-card',
  templateUrl: './th-hotel-card.component.html',
  styleUrls: ['./th-hotel-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ThBadgeComponent, ThButtonComponent]
})
export class ThHotelCardComponent {
  @Input() variant: ThHotelCardVariant = 'mobile';
  @Input() title = 'Hotel Name';
  @Input() location = 'City, Country';
  @Input() price = '$299';
  @Input() pricePrefix = 'From';
  @Input() priceSuffix = '/night';
  @Input() ctaLabel = 'View Details';
  @Input() ctaRouterLink: string | any[] | null = '/propertydetail';
  @Input() rating = '4.8';
  @Input() imageUrl = '';
  @Input() showFavorite = true;
  @Output() ctaClick = new EventEmitter<void>();
}
