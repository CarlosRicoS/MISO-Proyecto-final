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
  private _imageUrl = '';

  @Input()
  set imageUrl(value: string | string[] | null | undefined) {
    this._imageUrl = this.resolveImageUrl(value);
  }

  get imageUrl(): string {
    return this._imageUrl;
  }

  @Input() showFavorite = true;
  @Output() ctaClick = new EventEmitter<void>();

  private resolveImageUrl(value: string | string[] | null | undefined): string {
    if (Array.isArray(value)) {
      const firstValid = value.find((url) => typeof url === 'string' && url.trim().length > 0);
      return firstValid?.trim() || '';
    }

    if (typeof value === 'string') {
      return value.trim();
    }

    return '';
  }
}
