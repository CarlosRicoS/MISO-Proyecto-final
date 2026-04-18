import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { PropertyDetailService } from '@travelhub/core/services/property-detail.service';
import { AuthSessionService } from '@travelhub/core/services/auth-session.service';
import { BookingService, Reservation } from '@travelhub/core/services/booking.service';
import { ThDetailsMosaicImage } from '@travelhub/shared/components/th-details-mosaic/th-details-mosaic.component';
import {
  ThPaymentSummaryComponent,
  ThPaymentSummaryItem,
} from '@travelhub/shared/components/th-payment-summary/th-payment-summary.component';
import { PortalHotelesReservationOverviewCardComponent } from '@travelhub/shared/components/portal-hoteles/reservation-overview-card/portal-hoteles-reservation-overview-card.component';

@Component({
  selector: 'portal-hoteles-dashboard-reservation',
  templateUrl: './dashboard-reservation.page.html',
  styleUrls: ['./dashboard-reservation.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    ThPaymentSummaryComponent,
    PortalHotelesReservationOverviewCardComponent,
  ],
})
export class PortalHotelesDashboardReservationPage {
  reservationId = '';
  isLoading = false;
  errorMessage = '';

  overview = {
    hotelName: 'Hotel',
    location: 'Address unavailable',
    stayDateLabel: '-',
    nightsLabel: '-',
    guestLabel: '-',
    statusLabel: 'Pending',
    images: [] as ThDetailsMosaicImage[],
    totalPhotos: 0,
  };

  paymentSummary = {
    title: '$0',
    subtitle: 'per night',
    checkInValue: '',
    checkOutValue: '',
    guestsValue: '1',
    roomTypeValue: 'Standard Room',
    totalAmount: '$0',
  };

  summaryItems: ThPaymentSummaryItem[] = [];

  get isAcceptButtonDisabled(): boolean {
    const normalizedStatus = this.getNormalizedStatus();
    if (this.isLoading) {
      return true;
    }

    if (normalizedStatus === 'confirmed') {
      return true;
    }

    return this.isRejectedOrCanceledStatus(normalizedStatus);
  }

  get isRejectButtonDisabled(): boolean {
    const normalizedStatus = this.getNormalizedStatus();
    if (this.isLoading) {
      return true;
    }

    return this.isRejectedOrCanceledStatus(normalizedStatus);
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authSession: AuthSessionService,
    private readonly bookingService: BookingService,
    private readonly propertyDetailService: PropertyDetailService,
  ) {}

  ionViewWillEnter(): void {
    const reservationId = this.route.snapshot.paramMap.get('reservationId') || '';
    this.reservationId = reservationId.trim();
    void this.loadReservationDetail();
  }

  async onAcceptReservation(): Promise<void> {
    if (!this.reservationId || this.isAcceptButtonDisabled) {
      return;
    }

    try {
      await firstValueFrom(
        this.bookingService.adminConfirmBooking(this.reservationId, this.authSession.idToken),
      );
      await this.router.navigate(['/dashboard']);
    } catch {
      this.errorMessage = 'Unable to accept reservation.';
    }
  }

  async onRejectReservation(): Promise<void> {
    if (!this.reservationId || this.isRejectButtonDisabled) {
      return;
    }

    try {
      await firstValueFrom(
        this.bookingService.adminRejectBooking(this.reservationId, 'Rejected from dashboard', this.authSession.idToken),
      );
      await this.router.navigate(['/dashboard']);
    } catch {
      this.errorMessage = 'Unable to reject reservation.';
    }
  }

  private async loadReservationDetail(): Promise<void> {
    if (!this.reservationId) {
      this.errorMessage = 'Invalid reservation id.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const reservation = await firstValueFrom(
        this.bookingService.getReservation(this.reservationId, this.authSession.idToken),
      );
      const propertyDetail = await firstValueFrom(
        this.propertyDetailService.getPropertyDetail(reservation.property_id, this.authSession.idToken),
      );

      this.overview = {
        hotelName: propertyDetail.name || 'Hotel',
        location: this.getLocationText(propertyDetail.city, propertyDetail.country),
        stayDateLabel: this.getDateRangeLabel(reservation.period_start, reservation.period_end),
        nightsLabel: this.getNightsLabel(reservation.period_start, reservation.period_end),
        guestLabel: this.getGuestLabel(reservation),
        statusLabel: this.formatStatusLabel(reservation.status),
        images: this.toMosaicImages(propertyDetail.photos, propertyDetail.name),
        totalPhotos: propertyDetail.photos.length,
      };

      this.updatePaymentSummary(reservation);
    } catch {
      this.errorMessage = 'Unable to load reservation detail.';
    } finally {
      this.isLoading = false;
    }
  }

  private updatePaymentSummary(reservation: Reservation): void {
    const nights = this.getNightsCount(reservation.period_start, reservation.period_end);
    const total = this.getSafePrice(reservation.price);
    const nightlyRate = nights > 0 ? Math.round(total / nights) : total;
    const serviceFee = Math.round(total * 0.05);
    const taxes = Math.round(total * 0.075);
    const finalTotal = total + serviceFee + taxes;

    this.paymentSummary = {
      title: `$${nightlyRate}`,
      subtitle: 'per night',
      checkInValue: this.toIsoDate(reservation.period_start),
      checkOutValue: this.toIsoDate(reservation.period_end),
      guestsValue: `${reservation.guests || 1}`,
      roomTypeValue: 'Standard Room',
      totalAmount: this.formatCurrency(finalTotal),
    };

    this.summaryItems = [
      {
        label: `${this.formatCurrency(nightlyRate)} x ${Math.max(1, nights)} nights`,
        amount: this.formatCurrency(total),
      },
      {
        label: 'Service fee',
        amount: this.formatCurrency(serviceFee),
        muted: true,
      },
      {
        label: 'Taxes',
        amount: this.formatCurrency(taxes),
        muted: true,
      },
    ];
  }

  private getSafePrice(price: number): number {
    if (!Number.isFinite(price)) {
      return 0;
    }

    return Math.max(0, Math.round(price));
  }

  private getLocationText(city: string, country: string): string {
    const parts = [city, country]
      .map((value) => (value || '').trim())
      .filter((value) => Boolean(value));

    return parts.length ? parts.join(', ') : 'Location unavailable';
  }

  private getDateRangeLabel(start: string, end: string): string {
    return `${this.formatDate(start)} - ${this.formatDate(end)}`;
  }

  private getNightsLabel(start: string, end: string): string {
    const nights = this.getNightsCount(start, end);
    return `${nights} ${nights === 1 ? 'night' : 'nights'}`;
  }

  private getNightsCount(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return 1;
    }

    const diffMs = endDate.getTime() - startDate.getTime();
    const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 1;
  }

  private getGuestLabel(reservation: Reservation): string {
    const reservationLike = reservation as Reservation & {
      user_email?: string;
      guest_name?: string;
    };

    if (reservationLike.guest_name?.trim()) {
      return reservationLike.guest_name.trim();
    }

    if (reservationLike.user_email?.trim()) {
      return reservationLike.user_email.trim();
    }

    return this.authSession.userEmail || reservation.user_id || '-';
  }

  private toMosaicImages(photoUrls: string[], hotelName: string): ThDetailsMosaicImage[] {
    return (photoUrls || []).slice(0, 6).map((src, index) => ({
      src,
      alt: `${hotelName} photo ${index + 1}`,
    }));
  }

  private formatStatusLabel(status: string): string {
    const trimmed = (status || '').trim();
    if (!trimmed) {
      return 'Pending';
    }

    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }

  private formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value || '-';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  private toIsoDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toISOString().slice(0, 10);
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }

  private getNormalizedStatus(): string {
    return (this.overview.statusLabel || '').trim().toLowerCase();
  }

  private isRejectedOrCanceledStatus(status: string): boolean {
    return status === 'rejected' || status === 'canceled' || status === 'cancelled';
  }
}
