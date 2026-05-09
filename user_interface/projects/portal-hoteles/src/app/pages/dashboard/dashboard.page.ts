import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AuthSessionService } from '@travelhub/core/services/auth-session.service';
import { BookingService, Reservation } from '@travelhub/core/services/booking.service';
import { LocaleService } from '@travelhub/core/services/locale.service';
import { ReportsService, DashboardMetricsResponse } from '@travelhub/core/services/reports.service';
import { PortalHotelesGenericCardComponent } from '@travelhub/shared/components/portal-hoteles/generic-card/generic-card.component';
import { PortalHotelesGridCardComponent } from '@travelhub/shared/components/portal-hoteles/grid-card/grid-card.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'portal-hoteles-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, TranslateModule, PortalHotelesGenericCardComponent, PortalHotelesGridCardComponent],
})
export class PortalHotelesDashboardPage {
  private readonly pageSize = 4;
  private currentPage = 1;

  reservations: DashboardReservation[] = [];
  visibleReservations: DashboardReservation[] = [];
  isLoadingReservations = false;
  reservationsErrorMessage = '';

  metrics: DashboardMetricsResponse | null = null;

  private readonly translate = inject(TranslateService);
  private readonly localeService = inject(LocaleService);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor(
    private readonly authSession: AuthSessionService,
    private readonly bookingService: BookingService,
    private readonly reportsService: ReportsService,
  ) {}

  ionViewWillEnter(): void {
    void this.loadReservations();
    void this.loadMetrics();
  }

  get totalReservationsLabel(): string {
    return this.metrics ? String(this.metrics.total_reservations) : '—';
  }

  get monthlyRevenueLabel(): string {
    if (!this.metrics) return '—';
    return this.localeService.formatCurrency(this.metrics.monthly_revenue);
  }

  get revenueTrendLabel(): string {
    if (!this.metrics) return '';
    const pct = this.metrics.revenue_trend_pct ?? 0;
    return this.translate.instant('DASHBOARD.TREND_FROM_LAST_MONTH', {
      sign: pct >= 0 ? '+' : '',
      percent: pct.toFixed(1),
    });
  }

  get revenueTrendClass(): string {
    if (!this.metrics) return 'portal-hoteles-dashboard-card__hint';
    const pct = this.metrics.revenue_trend_pct ?? 0;
    return pct >= 0
      ? 'portal-hoteles-dashboard-card__hint portal-hoteles-dashboard-card__hint--positive'
      : 'portal-hoteles-dashboard-card__hint portal-hoteles-dashboard-card__hint--warning';
  }

  get todayCheckinsLabel(): string {
    return this.metrics ? String(this.metrics.today_checkins) : '—';
  }

  get todayCheckoutsLabel(): string {
    return this.metrics ? String(this.metrics.today_checkouts) : '—';
  }

  get operatorEmail(): string {
    return this.authSession.userEmail;
  }

  get totalReservations(): number {
    return this.reservations.length;
  }

  get visibleRangeLabel(): string {
    if (!this.totalReservations) {
      return this.translate.instant('DASHBOARD.SHOWING_NONE');
    }

    const rangeStart = (this.currentPage - 1) * this.pageSize + 1;
    const rangeEnd = rangeStart + this.visibleReservations.length - 1;
    return this.translate.instant('DASHBOARD.SHOWING_RANGE', {
      start: rangeStart,
      end: rangeEnd,
      total: this.totalReservations,
    });
  }

  get hasReservations(): boolean {
    return this.visibleReservations.length > 0;
  }

  get totalPages(): number {
    if (!this.totalReservations) {
      return 1;
    }

    return Math.ceil(this.totalReservations / this.pageSize);
  }

  get canGoToPreviousPage(): boolean {
    return this.currentPage > 1;
  }

  get canGoToNextPage(): boolean {
    return this.currentPage < this.totalPages;
  }

  get paginationLabel(): string {
    return this.translate.instant('DASHBOARD.PAGE_OF', {
      current: this.currentPage,
      total: this.totalPages,
    });
  }

  get shouldShowPagination(): boolean {
    return this.totalReservations > this.pageSize;
  }

  onPreviousPage(): void {
    if (!this.canGoToPreviousPage) {
      return;
    }

    this.currentPage -= 1;
    this.updateVisibleReservations();
  }

  onNextPage(): void {
    if (!this.canGoToNextPage) {
      return;
    }

    this.currentPage += 1;
    this.updateVisibleReservations();
  }

  onDownloadCsv(): void {
    if (!this.reservations.length || typeof document === 'undefined') {
      return;
    }

    const csvContent = this.buildOccupancyCsvForCurrentMonth();
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = `dashboard_reservations_${new Date().toISOString().split('T')[0]}.csv`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }

  getStatusClass(status: string): string {
    const normalizedStatus = status.trim().toLowerCase();
    switch (normalizedStatus) {
      case 'confirmed':
        return 'portal-hoteles-dashboard-status portal-hoteles-dashboard-status--confirmed';
      case 'pending':
        return 'portal-hoteles-dashboard-status portal-hoteles-dashboard-status--pending';
      case 'approved':
        return 'portal-hoteles-dashboard-status portal-hoteles-dashboard-status--approved';
      case 'canceled':
      case 'cancelled':
        return 'portal-hoteles-dashboard-status portal-hoteles-dashboard-status--canceled';
      case 'rejected':
        return 'portal-hoteles-dashboard-status portal-hoteles-dashboard-status--rejected';
      case 'completed':
        return 'portal-hoteles-dashboard-status portal-hoteles-dashboard-status--completed';
      default:
        return 'portal-hoteles-dashboard-status portal-hoteles-dashboard-status--default';
    }
  }

  private async loadMetrics(): Promise<void> {
    try {
      console.log('[Dashboard] Starting to load metrics...');
      this.metrics = await firstValueFrom(
        this.reportsService.getDashboardMetrics(this.authSession.idToken),
      );
      console.log('[Dashboard] Metrics loaded successfully:', this.metrics);
      if (typeof this.cdr.markForCheck === 'function') {
        this.cdr.markForCheck();
      }
    } catch (error) {
      console.error('[Dashboard] Error loading metrics:', error);
      this.metrics = null;
      if (typeof this.cdr.markForCheck === 'function') {
        this.cdr.markForCheck();
      }
    }
  }

  private async loadReservations(): Promise<void> {
    this.isLoadingReservations = true;
    this.reservationsErrorMessage = '';

    try {
      const reservations = await firstValueFrom(
        this.bookingService.listReservations(this.authSession.idToken, this.authSession.userId),
      );

      this.reservations = reservations.map((reservation) => this.toDashboardReservation(reservation));
      this.currentPage = 1;
      this.updateVisibleReservations();
    } catch {
      this.reservations = [];
      this.visibleReservations = [];
      this.currentPage = 1;
      this.reservationsErrorMessage = this.translate.instant('DASHBOARD.RESERVATIONS_ERROR');
    } finally {
      this.isLoadingReservations = false;
    }
  }

  private updateVisibleReservations(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.visibleReservations = this.reservations.slice(startIndex, endIndex);
  }

  private buildOccupancyCsvForCurrentMonth(): string {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return this.buildOccupancyCsvForRange(start, end);
  }

  private buildOccupancyCsvForRange(startDate: Date, endDate: Date): string {
    const reservationsInRange = this.reservations.filter(
      (reservation) => this.isReservationInRange(reservation, startDate, endDate) && this.isOccupancyRelevantStatus(reservation.statusValue),
    );

    const referenceRoomCount = this.getReferenceRoomCount(reservationsInRange);
    const headers = [
      'Date',
      'Occupied Rooms',
      'Available Rooms',
      'Occupancy %',
      'Completed Bookings',
      'Included Booking IDs',
    ];
    const rows: string[][] = [];

    for (const date of this.getDatesBetween(startDate, endDate)) {
      const activeReservations = reservationsInRange.filter((reservation) =>
        this.isReservationActiveOnDate(reservation, date),
      );
      const occupiedRooms = activeReservations.length;
      const completedBookings = activeReservations.filter(
        (reservation) => this.normalizeStatus(reservation.statusValue) === 'completed',
      ).length;
      const availableRooms = Math.max(referenceRoomCount - occupiedRooms, 0);
      const occupancyPct = referenceRoomCount > 0 ? (occupiedRooms / referenceRoomCount) * 100 : 0;
      const includedBookingIds = activeReservations.map((reservation) => reservation.bookingId).join('; ');

      rows.push([
        this.formatReportDate(date),
        String(occupiedRooms),
        String(availableRooms),
        `${occupancyPct.toFixed(2)}%`,
        String(completedBookings),
        includedBookingIds,
      ]);
    }

    const headerRow = headers.join(',');
    const dataRows = rows.map((row) => row.map((value) => this.toCsvCell(value)).join(','));
    return [headerRow, ...dataRows].join('\n');
  }

  private toCsvCell(value: string): string {
    const text = String(value ?? '');
    const escaped = text.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  private getDatesBetween(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(start.getFullYear(), start.getMonth(), start.getDate());

    while (current < end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  private getReferenceRoomCount(reservations: DashboardReservation[]): number {
    const propertyIds = new Set(
      reservations
        .map((reservation) => (reservation.propertyId || '').trim())
        .filter((propertyId) => Boolean(propertyId)),
    );

    return Math.max(propertyIds.size, 1);
  }

  private isReservationInRange(reservation: DashboardReservation, startDate: Date, endDate: Date): boolean {
    if (!reservation.periodStart || !reservation.periodEnd) {
      return false;
    }

    const reservationStart = this.toDayStart(reservation.periodStart);
    const reservationEnd = this.toDayStart(reservation.periodEnd);

    return reservationStart < endDate && reservationEnd > startDate;
  }

  private isReservationActiveOnDate(reservation: DashboardReservation, date: Date): boolean {
    if (!reservation.periodStart || !reservation.periodEnd) {
      return false;
    }

    const dayStart = this.toDayStart(date);
    const reservationStart = this.toDayStart(reservation.periodStart);
    const reservationEnd = this.toDayStart(reservation.periodEnd);

    return reservationStart <= dayStart && dayStart < reservationEnd;
  }

  private isOccupancyRelevantStatus(statusValue: string | undefined): boolean {
    const normalizedStatus = this.normalizeStatus(statusValue);
    return normalizedStatus === 'confirmed' || normalizedStatus === 'approved' || normalizedStatus === 'completed';
  }

  private normalizeStatus(statusValue: string | undefined): string {
    return (statusValue || '').trim().toLowerCase();
  }

  private toDayStart(value: string | Date): Date {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return new Date(0);
    }

    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private formatReportDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private toDashboardReservation(reservation: Reservation): DashboardReservation {
    const reservationLike = reservation as Reservation & {
      user_email?: string;
      guest_name?: string;
      reservation_id?: string;
    };

    const rawBookingId = reservation.id || reservationLike.reservation_id || '-';
    const bookingId = String(rawBookingId).trim() || '-';
    const guestName = this.getGuestName(reservationLike, reservation.user_id);
    const guestEmail = this.getGuestEmail(reservationLike);

    return {
      id: reservation.id,
      bookingId,
      bookingRoute: ['/dashboard', bookingId],
      guestName,
      guestEmail,
      checkInLabel: this.formatDate(reservation.period_start),
      checkOutLabel: this.formatDate(reservation.period_end),
      statusLabel: this.formatStatusLabel(reservation.status),
      statusValue: reservation.status,
      propertyId: reservation.property_id,
      periodStart: reservation.period_start,
      periodEnd: reservation.period_end,
    };
  }

  private getGuestName(
    reservation: Reservation & { user_email?: string; guest_name?: string },
    userId: string,
  ): string {
    if (reservation.guest_name?.trim()) {
      return reservation.guest_name.trim();
    }

    if (reservation.user_email?.trim()) {
      const emailUser = reservation.user_email.split('@')[0] || '';
      return this.toDisplayName(emailUser) || 'Guest';
    }

    return this.toDisplayName(userId) || 'Guest';
  }

  private getGuestEmail(reservation: Reservation & { user_email?: string }): string {
    if (reservation.user_email?.trim()) {
      return reservation.user_email.trim();
    }

    return this.authSession.userEmail || '-';
  }

  private toDisplayName(rawValue: string): string {
    const normalizedValue = (rawValue || '').trim();
    if (!normalizedValue) {
      return '';
    }

    const parts = normalizedValue
      .replace(/[._-]+/g, ' ')
      .split(' ')
      .map((part) => part.trim())
      .filter((part) => Boolean(part));

    if (!parts.length) {
      return '';
    }

    return parts
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  private formatDate(dateValue: string): string {
    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) {
      return dateValue || '-';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(parsedDate);
  }

  private formatStatusLabel(status: string): string {
    const normalizedValue = (status || '').trim().toUpperCase();
    if (!normalizedValue) {
      return this.translate.instant('DASHBOARD.STATUS_UNKNOWN');
    }

    switch (normalizedValue) {
      case 'CONFIRMED':
        return this.translate.instant('DASHBOARD.STATUS_CONFIRMED');
      case 'PENDING':
        return this.translate.instant('DASHBOARD.STATUS_PENDING');
      case 'APPROVED':
        return this.translate.instant('DASHBOARD.STATUS_APPROVED');
      case 'CANCELED':
      case 'CANCELLED':
        return this.translate.instant('DASHBOARD.STATUS_CANCELED');
      case 'REJECTED':
        return this.translate.instant('DASHBOARD.STATUS_REJECTED');
      case 'COMPLETED':
        return this.translate.instant('DASHBOARD.STATUS_COMPLETED');
      default:
        return normalizedValue.charAt(0).toUpperCase() + normalizedValue.slice(1).toLowerCase();
    }
  }
}

interface DashboardReservation {
  id: string;
  bookingId: string;
  bookingRoute: string[];
  guestName: string;
  guestEmail: string;
  checkInLabel: string;
  checkOutLabel: string;
  statusLabel: string;
  statusValue?: string;
  propertyId?: string;
  periodStart?: string;
  periodEnd?: string;
}
