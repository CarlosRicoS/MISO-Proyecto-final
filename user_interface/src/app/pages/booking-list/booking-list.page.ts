import { Component } from '@angular/core';
import { InfiniteScrollCustomEvent } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { BookingService, Reservation } from '../../core/services/booking.service';
import { PropertyDetail } from '../../core/models/property-detail.model';
import { PropertyDetailService } from '../../core/services/property-detail.service';
import { FilterSummaryParams } from '../../shared/components/th-filter-summary/th-filter-summary.component';

@Component({
  selector: 'app-booking-list',
  templateUrl: './booking-list.page.html',
  styleUrls: ['./booking-list.page.scss'],
  standalone: false,
})
export class BookingListPage {
  private readonly pageSize = 10;

  reservations: BookingListReservation[] = [];
  visibleReservations: BookingListReservation[] = [];
  selectedFilter: BookingFilterKey = 'all';
  isLoading = false;
  isPaging = false;
  canLoadNext = false;
  errorMessage = '';

  filterSummaryParams: FilterSummaryParams = {
    locationLabel: 'Section',
    locationValue: 'My bookings',
    checkInLabel: 'Sort',
    checkInValue: 'Newest first',
    checkOutLabel: 'Status',
    checkOutValue: 'All',
    guestsLabel: 'Guest',
    guestsValue: '-',
  };

  constructor(
    private bookingService: BookingService,
    private authSessionService: AuthSessionService,
    private propertyDetailService: PropertyDetailService,
  ) {
    this.filterSummaryParams = {
      ...this.filterSummaryParams,
      guestsValue: this.authSessionService.userEmail || '-',
    };
  }

  ionViewWillEnter(): void {
    void this.loadReservations();
  }

  get countLabel(): string {
    return `${this.filteredReservations.length} ${this.filteredReservations.length === 1 ? 'reservation' : 'reservations'} found`;
  }

  get filteredReservations(): BookingListReservation[] {
    switch (this.selectedFilter) {
      case 'upcoming':
        return this.reservations.filter((reservation) => this.isUpcoming(reservation));
      case 'completed':
        return this.reservations.filter((reservation) => this.isCompleted(reservation));
      case 'cancelled':
        return this.reservations.filter((reservation) => this.isCancelled(reservation));
      case 'all':
      default:
        return this.reservations;
    }
  }

  get bookingFilters(): BookingFilterItem[] {
    return [
      {
        key: 'all',
        label: 'All',
        count: this.reservations.length,
      },
      {
        key: 'upcoming',
        label: 'Upcoming',
        count: this.reservations.filter((reservation) => this.isUpcoming(reservation)).length,
      },
      {
        key: 'completed',
        label: 'Completed',
        count: this.reservations.filter((reservation) => this.isCompleted(reservation)).length,
      },
      {
        key: 'cancelled',
        label: 'Cancelled',
        count: this.reservations.filter((reservation) => this.isCancelled(reservation)).length,
      },
    ];
  }

  get emptyLabel(): string {
    if (this.selectedFilter === 'all') {
      return 'No reservations available.';
    }

    return `No ${this.selectedFilter} reservations available.`;
  }

  get checkInLabel(): string {
    return this.reservations.length ? this.formatDate(this.reservations[0].period_start) : '-';
  }

  get checkOutLabel(): string {
    return this.reservations.length ? this.formatDate(this.reservations[0].period_end) : '-';
  }

  getReservationLocation(reservation: BookingListReservation): string {
    return reservation.location;
  }

  getReservationRating(reservation: BookingListReservation): string {
    switch (reservation.status.trim().toUpperCase()) {
      case 'CONFIRMED':
        return '4.8';
      case 'COMPLETED':
        return '4.9';
      case 'PENDING':
        return '4.5';
      case 'CANCELED':
      case 'CANCELLED':
        return '4.0';
      default:
        return '4.6';
    }
  }

  formatDate(value: string): string {
    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(parsedDate);
  }

  formatStayDateRange(periodStart: string, periodEnd: string): string {
    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return `${this.formatDate(periodStart)} - ${this.formatDate(periodEnd)}`;
    }

    const startMonth = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(startDate);
    const endMonth = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(endDate);
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();

    if (startYear === endYear && startDate.getMonth() === endDate.getMonth()) {
      return `${startMonth} ${startDate.getDate()} - ${endDate.getDate()}`;
    }

    if (startYear === endYear) {
      return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}`;
    }

    return `${startMonth} ${startDate.getDate()}, ${startYear} - ${endMonth} ${endDate.getDate()}, ${endYear}`;
  }

  getNightsLabel(periodStart: string, periodEnd: string): string {
    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return '-';
    }

    const startUtc = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endUtc = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const nights = Math.max(0, Math.round((endUtc - startUtc) / (1000 * 60 * 60 * 24)));

    return `${nights} ${nights === 1 ? 'night' : 'nights'}`;
  }

  formatPrice(value: number): string {
    if (!Number.isFinite(value)) {
      return '$0';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  }

  getStatusClass(status: string): string {
    return `booking-list-status booking-list-status--${status.toLowerCase()}`;
  }

  setFilter(filter: BookingFilterKey): void {
    this.selectedFilter = filter;
    this.resetPagination();
  }

  isFilterActive(filter: BookingFilterKey): boolean {
    return this.selectedFilter === filter;
  }

  async loadMoreReservations(event: InfiniteScrollCustomEvent): Promise<void> {
    await this.loadNextPage();
    event.target.complete();
    event.target.disabled = !this.canLoadNext;
  }

  private async loadReservations(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const reservations = await firstValueFrom(
        this.bookingService.listReservations(this.authSessionService.idToken, this.authSessionService.userId),
      );

      this.reservations = reservations.map((reservation) => this.createReservationViewModel(reservation));
      this.resetPagination();

      void this.enrichReservationsWithPropertyDetails();
    } catch (error) {
      this.errorMessage = 'Unable to load reservations.';
      this.visibleReservations = [];
      this.canLoadNext = false;
    } finally {
      this.isLoading = false;
    }
  }

  private resetPagination(): void {
    const source = this.filteredReservations;
    this.visibleReservations = source.slice(0, this.pageSize);
    this.canLoadNext = source.length > this.visibleReservations.length;
  }

  private async loadNextPage(): Promise<void> {
    if (this.isLoading || this.isPaging || !this.canLoadNext) {
      return;
    }

    this.isPaging = true;

    try {
      const source = this.filteredReservations;
      const nextEnd = this.visibleReservations.length + this.pageSize;
      this.visibleReservations = source.slice(0, nextEnd);
      this.canLoadNext = source.length > this.visibleReservations.length;
    } finally {
      this.isPaging = false;
    }
  }

  private async enrichReservationsWithPropertyDetails(): Promise<void> {
    const detailPromises = this.reservations.map(async (reservation) => {
      const propertyId = this.getReservationPropertyId(reservation);

      if (!propertyId) {
        return;
      }

      try {
        const detail = await firstValueFrom(this.propertyDetailService.getPropertyDetail(propertyId));
        this.applyReservationDetail(reservation.id, {
          propertyName: detail.name || reservation.propertyName,
          location: this.formatPropertyLocation(detail) || reservation.location,
          photoUrl: detail.photos?.[0] || reservation.photoUrl,
        });
      } catch {
        this.applyReservationDetail(reservation.id, {
          location: reservation.location || 'Location unavailable',
        });
      }
    });

    await Promise.all(detailPromises);
  }

  private createReservationViewModel(reservation: Reservation): BookingListReservation {
    return {
      ...reservation,
      propertyName: `Property ${reservation.property_id}`,
      location: 'Location unavailable',
      photoUrl: '',
    };
  }

  private applyReservationDetail(reservationId: string, patch: Partial<BookingListReservation>): void {
    this.reservations = this.reservations.map((reservation) =>
      reservation.id === reservationId ? { ...reservation, ...patch } : reservation,
    );

    this.visibleReservations = this.visibleReservations.map((reservation) =>
      reservation.id === reservationId ? { ...reservation, ...patch } : reservation,
    );
  }

  private getReservationPropertyId(reservation: Reservation): string {
    const reservationWithAltShape = reservation as Reservation & { propertyId?: string };
    const rawPropertyId = reservation.property_id || reservationWithAltShape.propertyId || '';

    return String(rawPropertyId).trim();
  }

  private formatPropertyLocation(propertyDetail?: PropertyDetail): string {
    if (!propertyDetail) {
      return '';
    }

    const parts = [propertyDetail.city, propertyDetail.country]
      .map((value) => (value || '').trim())
      .filter((value) => Boolean(value));

    return parts.join(', ');
  }

  private isUpcoming(reservation: BookingListReservation): boolean {
    if (this.isCancelled(reservation) || this.isCompleted(reservation)) {
      return false;
    }

    const periodEnd = new Date(reservation.period_end);
    if (Number.isNaN(periodEnd.getTime())) {
      return true;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return periodEnd >= now;
  }

  private isCompleted(reservation: BookingListReservation): boolean {
    const normalizedStatus = reservation.status.trim().toUpperCase();
    if (normalizedStatus === 'COMPLETED') {
      return true;
    }

    const periodEnd = new Date(reservation.period_end);
    if (Number.isNaN(periodEnd.getTime())) {
      return false;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return periodEnd < now;
  }

  private isCancelled(reservation: BookingListReservation): boolean {
    const normalizedStatus = reservation.status.trim().toUpperCase();
    return normalizedStatus === 'CANCELED' || normalizedStatus === 'CANCELLED';
  }
}

type BookingFilterKey = 'all' | 'upcoming' | 'completed' | 'cancelled';

interface BookingFilterItem {
  key: BookingFilterKey;
  label: string;
  count: number;
}

interface BookingListReservation extends Reservation {
  propertyName: string;
  location: string;
  photoUrl: string;
}

interface ReservationPropertyData {
  detail: PropertyDetail;
  location: string;
}
