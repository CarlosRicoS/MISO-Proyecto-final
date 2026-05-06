import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { PropertyDetailService } from '@travelhub/core/services/property-detail.service';
import { AuthSessionService } from '@travelhub/core/services/auth-session.service';
import { BookingService, Reservation, ReservationAdminActionRequest, ReservationAdminRejectRequest } from '@travelhub/core/services/booking.service';
import { LocaleService } from '@travelhub/core/services/locale.service';
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
    TranslateModule,
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

  private readonly translate = inject(TranslateService);
  private readonly localeService = inject(LocaleService);

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
      const payload: ReservationAdminActionRequest = {
        traveler_email: this.authSession.userEmail || '',
      };
      await firstValueFrom(
        this.bookingService.adminConfirmReservation(this.reservationId, payload, this.authSession.idToken),
      );
      await this.router.navigate(['/dashboard']);
    } catch {
      this.errorMessage = this.translate.instant('DASHBOARD_RESERVATION.ERROR_ACCEPT');
    }
  }

  async onRejectReservation(): Promise<void> {
    if (!this.reservationId || this.isRejectButtonDisabled) {
      return;
    }

    try {
      const payload: ReservationAdminRejectRequest = {
        traveler_email: this.authSession.userEmail || '',
        reason: this.translate.instant('DASHBOARD_RESERVATION.REJECT_REASON_DEFAULT'),
      };
      await firstValueFrom(
        this.bookingService.adminRejectReservation(this.reservationId, payload, this.authSession.idToken),
      );
      await this.router.navigate(['/dashboard']);
    } catch {
      this.errorMessage = this.translate.instant('DASHBOARD_RESERVATION.ERROR_REJECT');
    }
  }

  private async loadReservationDetail(): Promise<void> {
    if (!this.reservationId) {
      this.errorMessage = this.translate.instant('DASHBOARD_RESERVATION.ERROR_INVALID_ID');
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
      this.errorMessage = this.translate.instant('DASHBOARD_RESERVATION.ERROR_LOAD');
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
      title: this.localeService.formatCurrency(nightlyRate),
      subtitle: this.translate.instant('DASHBOARD_RESERVATION.PER_NIGHT'),
      checkInValue: this.toIsoDate(reservation.period_start),
      checkOutValue: this.toIsoDate(reservation.period_end),
      guestsValue: `${reservation.guests || 1}`,
      roomTypeValue: this.translate.instant('DASHBOARD_RESERVATION.STANDARD_ROOM'),
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

    return parts.length ? parts.join(', ') : this.translate.instant('DASHBOARD_RESERVATION.LOCATION_UNAVAILABLE');
  }

  private getDateRangeLabel(start: string, end: string): string {
    return `${this.formatDate(start)} - ${this.formatDate(end)}`;
  }

  private getNightsLabel(start: string, end: string): string {
    const nights = this.getNightsCount(start, end);
    const key = nights === 1 ? 'DASHBOARD_RESERVATION.NIGHT_ONE' : 'DASHBOARD_RESERVATION.NIGHTS';
    return `${nights} ${this.translate.instant(key)}`;
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
    return this.localeService.formatCurrency(value);
  }

  private getNormalizedStatus(): string {
    return (this.overview.statusLabel || '').trim().toLowerCase();
  }

  private isRejectedOrCanceledStatus(status: string): boolean {
    return status === 'rejected' || status === 'canceled' || status === 'cancelled';
  }
}
