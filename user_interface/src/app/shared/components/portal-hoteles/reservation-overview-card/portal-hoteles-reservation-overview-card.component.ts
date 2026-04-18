import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import {
  ThDetailsMosaicComponent,
  ThDetailsMosaicImage,
} from '../../th-details-mosaic/th-details-mosaic.component';

@Component({
  selector: 'portal-hoteles-reservation-overview-card',
  templateUrl: './portal-hoteles-reservation-overview-card.component.html',
  styleUrls: ['./portal-hoteles-reservation-overview-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ThDetailsMosaicComponent],
})
export class PortalHotelesReservationOverviewCardComponent {
  @Input() hotelName = 'Hotel';
  @Input() location = '';
  @Input() stayDateLabel = '-';
  @Input() nightsLabel = '-';
  @Input() guestLabel = '-';
  @Input() statusLabel = 'Pending';
  @Input() images: ThDetailsMosaicImage[] = [];
  @Input() totalPhotos = 0;

  get statusClass(): string {
    const normalizedStatus = this.statusLabel.trim().toLowerCase();
    switch (normalizedStatus) {
      case 'confirmed':
        return 'portal-hoteles-reservation-overview-card__status portal-hoteles-reservation-overview-card__status--confirmed';
      case 'pending':
        return 'portal-hoteles-reservation-overview-card__status portal-hoteles-reservation-overview-card__status--pending';
      case 'canceled':
      case 'cancelled':
      case 'rejected':
        return 'portal-hoteles-reservation-overview-card__status portal-hoteles-reservation-overview-card__status--rejected';
      default:
        return 'portal-hoteles-reservation-overview-card__status portal-hoteles-reservation-overview-card__status--default';
    }
  }
}