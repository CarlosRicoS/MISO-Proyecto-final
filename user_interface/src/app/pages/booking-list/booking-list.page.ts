import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { InfiniteScrollCustomEvent } from '@ionic/angular';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { BookingService, Reservation } from '../../core/services/booking.service';
import { PropertyDetail } from '../../core/models/property-detail.model';
import { LocaleService } from '../../core/services/locale.service';
import { PropertyDetailService } from '../../core/services/property-detail.service';
import { ImageCacheService } from '../../core/services/image-cache.service';
import { FilterSummaryParams } from '../../shared/components/th-filter-summary/th-filter-summary.component';

@Component({
  selector: 'app-booking-list',
  templateUrl: './booking-list.page.html',
  styleUrls: ['./booking-list.page.scss'],
  standalone: false,
})
export class BookingListPage implements OnInit, OnDestroy {
  private readonly pageSize = 10;
  private readonly destroy$ = new Subject<void>();

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
    private router: Router,
    private imageCache: ImageCacheService,
    private translate: TranslateService,
    private localeService: LocaleService,
  ) {
    this.filterSummaryParams = {
      ...this.filterSummaryParams,
      guestsValue: this.authSessionService.userEmail || '-',
    };
  }

  ngOnInit(): void {
    // Refresh price labels and counters when the language switches.
    this.localeService.currentLang$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.reservations = [...this.reservations];
        this.visibleReservations = [...this.visibleReservations];
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ionViewWillEnter(): void {
    void this.loadReservations();
  }

  get countLabel(): string {
    const count = this.filteredReservations.length;
    const key = count === 1 ? 'BOOKING_LIST.RESERVATION_ONE' : 'BOOKING_LIST.RESERVATIONS_FOUND';
    return `${count} ${this.translate.instant(key)}`;
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
        label: this.translate.instant('BOOKING_LIST.FILTER_ALL'),
        count: this.reservations.length,
      },
      {
        key: 'upcoming',
        label: this.translate.instant('BOOKING_LIST.FILTER_UPCOMING'),
        count: this.reservations.filter((reservation) => this.isUpcoming(reservation)).length,
      },
      {
        key: 'completed',
        label: this.translate.instant('BOOKING_LIST.FILTER_COMPLETED'),
        count: this.reservations.filter((reservation) => this.isCompleted(reservation)).length,
      },
      {
        key: 'cancelled',
        label: this.translate.instant('BOOKING_LIST.FILTER_CANCELLED'),
        count: this.reservations.filter((reservation) => this.isCancelled(reservation)).length,
      },
    ];
  }

  get emptyLabel(): string {
    if (this.selectedFilter === 'all') {
      return this.translate.instant('BOOKING_LIST.EMPTY_ALL');
    }

    const filterKey = this.selectedFilter;
    const filterLabel = this.translate.instant(this.getFilterLabelKey(filterKey)).toLowerCase();
    return this.translate.instant('BOOKING_LIST.EMPTY_FILTERED', { filter: filterLabel });
  }

  private getFilterLabelKey(filter: BookingFilterKey): string {
    switch (filter) {
      case 'upcoming':
        return 'BOOKING_LIST.FILTER_UPCOMING';
      case 'completed':
        return 'BOOKING_LIST.FILTER_COMPLETED';
      case 'cancelled':
        return 'BOOKING_LIST.FILTER_CANCELLED';
      default:
        return 'BOOKING_LIST.FILTER_ALL';
    }
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

    const key = nights === 1 ? 'BOOKING_LIST.NIGHT_ONE' : 'BOOKING_LIST.NIGHTS';
    return `${nights} ${this.translate.instant(key)}`;
  }

  formatPrice(value: number): string {
    return this.localeService.formatCurrency(value);
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

  async openBookingDetail(reservation: BookingListReservation): Promise<void> {
    await this.router.navigate(['/booking-detail'], {
      queryParams: {
        bookingId: reservation.id,
      },
      state: {
        bookingId: reservation.id,
        bookingStatus: this.getBookingStatusLabel(reservation.status),
        reservation: {
          id: reservation.id,
          property_id: reservation.property_id,
          user_id: reservation.user_id,
          guests: reservation.guests,
          period_start: reservation.period_start,
          period_end: reservation.period_end,
          price: reservation.price,
          status: reservation.status,
          admin_group_id: reservation.admin_group_id,
          payment_reference: reservation.payment_reference,
          created_at: reservation.created_at,
        },
      },
    });
  }

  getBookingStatusLabelForDisplay(status: string): string {
    return this.getBookingStatusLabel(status);
  }

  private getBookingStatusLabel(status: string): string {
    const normalizedStatus = (status || '').trim().toUpperCase();

    switch (normalizedStatus) {
      case 'PENDING':
        return this.translate.instant('BOOKING_LIST.STATUS_PENDING');
      case 'CONFIRMED':
        return this.translate.instant('BOOKING_LIST.STATUS_CONFIRMED');
      case 'COMPLETED':
        return this.translate.instant('BOOKING_LIST.STATUS_COMPLETED');
      case 'CANCELED':
      case 'CANCELLED':
        return this.translate.instant('BOOKING_LIST.STATUS_CANCELLED');
      default:
        return normalizedStatus
          ? normalizedStatus.charAt(0) + normalizedStatus.slice(1).toLowerCase()
          : this.translate.instant('BOOKING_LIST.STATUS_PENDING');
    }
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
      this.errorMessage = this.translate.instant('BOOKING_LIST.ERROR');
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
        // Pre-cache property images for offline access (await to ensure images are cached)
        if (detail.photos && detail.photos.length > 0) {
          await this.imageCache.cacheImages(detail.photos);
        }
        this.applyReservationDetail(reservation.id, {
          propertyName: detail.name || reservation.propertyName,
          location: this.formatPropertyLocation(detail) || reservation.location,
          photoUrl: this.imageCache.resolveImageUrl(detail.photos?.[0] as string) || reservation.photoUrl,
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
