import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
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
      this.metrics = await firstValueFrom(
        this.reportsService.getDashboardMetrics(this.authSession.idToken),
      );
    } catch {
      this.metrics = null;
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
}
