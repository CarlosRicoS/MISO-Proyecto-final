import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom, Subject, of, EMPTY } from 'rxjs';
import { switchMap, takeUntil, tap, catchError } from 'rxjs/operators';
import { Hotel } from '../../core/models/hotel.model';
import { PropertyDetail } from '../../core/models/property-detail.model';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { BookingService, CancellationPolicyResponse, Reservation } from '../../core/services/booking.service';
import { ConfigService } from '../../core/services/config.service';
import { PropertyDetailService } from '../../core/services/property-detail.service';
import { PricingService } from '../../core/services/pricing.service';
import { ImageCacheService } from '../../core/services/image-cache.service';
import { ThAmenityItem } from '../../shared/components/th-amenities-summary/th-amenities-summary.component';
import { ThDetailsMosaicImage } from '../../shared/components/th-details-mosaic/th-details-mosaic.component';
import { ThPaymentSummaryCompactTab, ThPaymentSummaryItem } from '../../shared/components/th-payment-summary/th-payment-summary.component';
import { ThGuestReviewItem, ThReviewCategoryScore } from '../../shared/components/th-property-review-summary/th-property-review-summary.component';
import { ThAmenitiesSummaryComponent } from '../../shared/components/th-amenities-summary/th-amenities-summary.component';
import { ThDetailSummaryComponent } from '../../shared/components/th-detail-summary/th-detail-summary.component';
import { ThDetailSummaryStatusVariant } from '../../shared/components/th-detail-summary/th-detail-summary.component';
import { ThDetailsMosaicComponent } from '../../shared/components/th-details-mosaic/th-details-mosaic.component';
import { ThPaymentSummaryComponent } from '../../shared/components/th-payment-summary/th-payment-summary.component';
import { ThPopupComponent, ThPopupVariant } from '../../shared/components/th-popup/th-popup.component';
import { ThPropertyDescriptionSummaryComponent } from '../../shared/components/th-property-description-summary/th-property-description-summary.component';
import { ThPropertyReviewSummaryComponent } from '../../shared/components/th-property-review-summary/th-property-review-summary.component';
import { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint } from '@capacitor/barcode-scanner';

@Component({
  selector: 'app-booking-detail',
  templateUrl: './booking-detail.page.html',
  styleUrls: ['./booking-detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule,
    ThAmenitiesSummaryComponent,
    ThDetailSummaryComponent,
    ThDetailsMosaicComponent,
    ThPaymentSummaryComponent,
    ThPopupComponent,
    ThPropertyDescriptionSummaryComponent,
    ThPropertyReviewSummaryComponent,
  ],
})
export class BookingDetailPage implements OnInit, OnDestroy {
  private readonly translate = inject(TranslateService);
  property = {
    title: 'Property',
    location: '',
    price: '$0',
    rating: 'N/A',
    score: '',
    scoreLabel: '',
    reviewsText: 'No reviews yet',
    stars: 0,
    imageUrl: '',
    totalPhotos: 0,
    images: [] as ThDetailsMosaicImage[],
  };

  summaryItems: ThPaymentSummaryItem[] = [];

  descriptionParagraphs: string[] = [];

  amenities: ThAmenityItem[] = [];

  reviewCategoryScores: ThReviewCategoryScore[] = [];

  guestReviews: ThGuestReviewItem[] = [];

  isLoading = false;
  isCancelling = false;
  errorMessage = '';

  isCheckInAvailable: boolean | null = null;
  isCheckInAvailabilityLoading = false;
  isCheckInSubmitting = false;

  isAlertOpen = false;
  alertTitle = '';
  alertMessage = '';
  alertVariant: ThPopupVariant = 'info';

  isCancelConfirmOpen = false;
  cancelConfirmMessage = 'No refund after cancellation. Would you continue?';
  shouldNavigateToBookingList = false;

  paymentSummary = {
    title: '$0',
    subtitle: 'per night',
    promoText: 'Reservation details',
    checkInValue: '',
    checkOutValue: '',
    guestsValue: '',
    roomTypeValue: 'Standard Room',
    totalAmount: '$0',
  };

  bookingStatus = 'Upcoming';
  bookingStatusVariant: ThDetailSummaryStatusVariant = 'pending';
  bookingDateRange = '';
  bookingNights = '';
  private rawBookingStatus = 'PENDING';

  paymentSummaryResetVersion = 0;

  hasDateChanges = false;
  isRecalculating = false;
  isMobileViewport = false;
  mobileConfirmedTab: 'change-dates' | 'cancel' = 'cancel';
  
  // Accordion state
  isCancelAccordionOpen = true;
  isChangeDatesAccordionOpen = false;

  previewedNewPrice: number | null = null;
  isPricingLoading = false;
  pricingError = '';
  isCancellationPolicyLoading = false;

  private priceTrigger$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  private currentReservation: Reservation | null = null;
  private hasInitialized = false;
  private isRefreshingPageData = false;
  constructor(
    private propertyDetailService: PropertyDetailService,
    private bookingService: BookingService,
    private authSessionService: AuthSessionService,
    private configService: ConfigService,
    private pricingService: PricingService,
    private route: ActivatedRoute,
    private router: Router,
    private imageCache: ImageCacheService,
    private httpClient: HttpClient,
  ) {
    this.priceTrigger$.pipe(
      takeUntil(this.destroy$),
      switchMap(() => {
        const propertyId = this.currentReservation?.property_id || '';
        const checkIn = this.normalizeDateForApi(this.paymentSummary.checkInValue);
        const checkOut = this.normalizeDateForApi(this.paymentSummary.checkOutValue);
        const guests = Number.parseInt(String(this.paymentSummary.guestsValue || '').trim(), 10);
        const guestCount = Number.isFinite(guests) && guests > 0 ? guests : 1;

        if (!propertyId || !checkIn || !checkOut) {
          return EMPTY;
        }

        this.isPricingLoading = true;
        this.pricingError = '';

        return this.pricingService.getPropertyWithPrice({
          propertyId,
          guests: guestCount,
          dateInit: checkIn,
          dateFinish: checkOut,
        }).pipe(
          tap((result) => {
            this.previewedNewPrice = result.price;
            this.isPricingLoading = false;

            const nights = this.getNightsBetween(checkIn, checkOut);
            const currency = this.currentReservation ? (this.property.price.charAt(0) || '$') : '$';
            const perNight = nights > 0 ? Math.round(result.price / nights) : result.price;

            this.paymentSummary = {
              ...this.paymentSummary,
              title: this.formatAmount(perNight, currency),
              totalAmount: this.formatAmount(result.price, currency),
            };

            this.summaryItems = [
              {
                label: `${this.formatAmount(perNight, currency)} x ${nights} nights`,
                amount: this.formatAmount(result.price, currency),
              },
            ];
          }),
          catchError(() => {
            this.isPricingLoading = false;
            this.previewedNewPrice = null;
            this.pricingError = this.translate.instant('PROPERTY.PRICING_ERROR');
            return of(null);
          }),
        );
      }),
    ).subscribe();
  }

  async ngOnInit(): Promise<void> {
    this.hasInitialized = true;

    // Subscribe to language changes and re-translate the booking status dynamically
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.rawBookingStatus) {
          this.bookingStatus = this.getBookingStatusLabel(this.rawBookingStatus);
        }
      });

    await this.refreshPageData();
  }

  ionViewWillEnter(): void {
    if (!this.hasInitialized) {
      return;
    }

    void this.refreshPageData();
  }

  private async fetchCheckInAvailability(propertyId: string): Promise<void> {
    if (!propertyId) {
      return;
    }

    this.isCheckInAvailabilityLoading = true;
    this.isCheckInAvailable = null;

    try {
      const params = new HttpParams().set('property_id', propertyId);
      const url = this.getCheckInApiUrl('/checkin/api/check-in/available');
      const response = await firstValueFrom(
        this.httpClient.get<{ property_id?: string; is_available?: boolean }>(url, {
          params,
          headers: {
            Authorization: `Bearer ${this.authSessionService.idToken}`,
          },
        }),
      );
      this.isCheckInAvailable = Boolean(response.is_available);
    } catch (error) {
      this.isCheckInAvailable = null;
    } finally {
      this.isCheckInAvailabilityLoading = false;
    }
  }

  private async refreshPageData(): Promise<void> {
    if (this.isRefreshingPageData) {
      return;
    }

    this.isRefreshingPageData = true;
    this.updateViewportFlags();

    if (!this.authSessionService.isLoggedIn) {
      await this.router.navigate(['/login'], {
        queryParams: {
          returnUrl: this.router.url,
        },
      });
      this.isRefreshingPageData = false;
      return;
    }

    const navState = this.router.getCurrentNavigation()?.extras.state ?? history.state;
    const stateReservation = (navState?.['reservation'] as Reservation | undefined) ?? undefined;
    const statePropertyDetail = (navState?.['propertyDetail'] as PropertyDetail | undefined) ?? undefined;
    const stateHotel = (navState?.['hotel'] as Hotel | undefined) ?? undefined;
    const stateBookingStatus = String(navState?.['bookingStatus'] || '').trim();
    const bookingId = this.getBookingId(navState);

    if (stateReservation?.status) {
      this.rawBookingStatus = stateReservation.status;
      this.bookingStatus = this.getBookingStatusLabel(this.rawBookingStatus);
    } else if (stateBookingStatus) {
      // Fallback for when only translated status is in state
      this.bookingStatus = stateBookingStatus;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Determine property ID and fetch check-in availability
      let propertyId: string | undefined;
      
      if (stateReservation) {
        propertyId = stateReservation.property_id;
      } else if (bookingId) {
        const reservation = await firstValueFrom(
          this.bookingService.getReservation(bookingId, this.authSessionService.idToken),
        );
        propertyId = reservation.property_id;
      }

      // Fetch check-in availability before loading page content
      if (propertyId) {
        await this.fetchCheckInAvailability(propertyId);
      }

      if (stateReservation && statePropertyDetail) {
        this.applyBookingDetail(stateReservation, statePropertyDetail, stateHotel);
        return;
      }

      if (stateReservation) {
        await this.loadPropertyDetail(stateReservation.property_id, stateReservation, stateHotel);
        return;
      }

      if (!bookingId) {
        this.errorMessage = this.translate.instant('BOOKING_DETAIL.ERROR');
        return;
      }

      const reservation = await firstValueFrom(
        this.bookingService.getReservation(bookingId, this.authSessionService.idToken),
      );
      await this.loadPropertyDetail(reservation.property_id, reservation, stateHotel);
    } catch (error) {
      this.errorMessage = this.translate.instant('BOOKING_DETAIL.ERROR');
    } finally {
      this.isLoading = false;
      this.isRefreshingPageData = false;
    }
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

  get isAccordionLayout(): boolean {
    const normalizedStatus = (this.rawBookingStatus || '').trim().toUpperCase();
    return normalizedStatus === 'CONFIRMED';
  }

  get isFlatEditableLayout(): boolean {
    const normalizedStatus = (this.rawBookingStatus || '').trim().toUpperCase();
    return normalizedStatus === 'UPCOMING' || normalizedStatus === 'PENDING' || normalizedStatus === 'REJECTED';
  }

  get isEditableStatus(): boolean {
    return this.isAccordionLayout || this.isFlatEditableLayout;
  }

  get isFlatCancelLayout(): boolean {
    const normalizedStatus = (this.rawBookingStatus || '').trim().toUpperCase();
    return normalizedStatus === 'UPCOMING' || normalizedStatus === 'PENDING';
  }

  get isFlatChangeDatesLayout(): boolean {
    const normalizedStatus = (this.rawBookingStatus || '').trim().toUpperCase();
    return normalizedStatus === 'REJECTED';
  }

  get showCancelAccordion(): boolean {
    const normalizedStatus = (this.rawBookingStatus || '').trim().toUpperCase();
    return normalizedStatus === 'CONFIRMED';
  }

  get showChangeDatesAccordion(): boolean {
    const normalizedStatus = (this.rawBookingStatus || '').trim().toUpperCase();
    return normalizedStatus === 'CONFIRMED';
  }

  get isCancellationHiddenForStatus(): boolean {
    const normalizedStatus = (this.rawBookingStatus || '').trim().toUpperCase();
    return normalizedStatus === 'CANCELED' || normalizedStatus === 'CANCELLED' || normalizedStatus === 'COMPLETED';
  }

  get showMobileStickyPanel(): boolean {
    return this.isMobileViewport;
  }

  get mobilePanelTabs(): ThPaymentSummaryCompactTab[] {
    if (this.isAccordionLayout) {
      return [
        { id: 'cancel', label: this.translate.instant('BOOKING_DETAIL.CANCEL_RESERVATION') },
        { id: 'change-dates', label: this.translate.instant('BOOKING_DETAIL.CHANGE_DATES') },
      ];
    }

    return [];
  }

  get mobilePanelEditable(): boolean {
    const normalizedStatus = (this.bookingStatus || '').trim().toUpperCase();
    if (normalizedStatus === 'CONFIRMED') {
      return this.mobileConfirmedTab === 'change-dates';
    }

    return normalizedStatus === 'REJECTED';
  }

  get mobilePanelHideAfterTotal(): boolean {
    return this.isCancellationHiddenForStatus;
  }

  get mobilePanelShowAction(): boolean {
    return !this.mobilePanelHideAfterTotal;
  }

  get mobilePanelActionLabel(): string {
    const normalizedStatus = (this.bookingStatus || '').trim().toUpperCase();
    if (normalizedStatus === 'UPCOMING') {
      return this.translate.instant('BOOKING_DETAIL.CANCEL_RESERVATION');
    }

    if (normalizedStatus === 'CONFIRMED') {
      return this.mobileConfirmedTab === 'change-dates'
        ? this.translate.instant('BOOKING_DETAIL.RECALCULATE_PRICE')
        : this.translate.instant('BOOKING_DETAIL.CANCEL_RESERVATION');
    }

    if (normalizedStatus === 'REJECTED') {
      return this.translate.instant('BOOKING_DETAIL.RECALCULATE_PRICE');
    }

    return this.translate.instant('BOOKING_DETAIL.CANCEL');
  }

  get mobilePanelActionDisabled(): boolean {
    const normalizedStatus = (this.bookingStatus || '').trim().toUpperCase();
    if (normalizedStatus === 'UPCOMING') {
      return this.isCancelling || this.isCancellationPolicyLoading;
    }

    if (normalizedStatus === 'CONFIRMED') {
      return this.mobileConfirmedTab === 'change-dates'
        ? this.isRecalculating || this.isCancelling
        : this.isCancelling || this.isRecalculating || this.isCancellationPolicyLoading;
    }

    if (normalizedStatus === 'REJECTED') {
      return this.isRecalculating || this.isCancelling;
    }

    return true;
  }

  get mobilePanelIsLoading(): boolean {
    const normalizedStatus = (this.bookingStatus || '').trim().toUpperCase();
    if (normalizedStatus === 'UPCOMING') {
      return this.isCancelling || this.isCancellationPolicyLoading;
    }

    if (normalizedStatus === 'CONFIRMED') {
      return this.mobileConfirmedTab === 'change-dates'
        ? this.isRecalculating
        : this.isCancelling || this.isCancellationPolicyLoading;
    }

    if (normalizedStatus === 'REJECTED') {
      return this.isRecalculating;
    }

    return false;
  }

  get mobilePanelPromoText(): string {
    const normalizedStatus = (this.bookingStatus || '').trim().toUpperCase();
    if (normalizedStatus === 'CONFIRMED') {
      return this.mobileConfirmedTab === 'change-dates'
        ? this.translate.instant('BOOKING_DETAIL.UPDATE_DATES_PROMO')
        : this.translate.instant('BOOKING_DETAIL.RESERVATION_DETAILS_PROMO');
    }

    return this.mobilePanelEditable
      ? this.translate.instant('BOOKING_DETAIL.UPDATE_DATES_PROMO')
      : this.translate.instant('BOOKING_DETAIL.RESERVATION_DETAILS_PROMO');
  }

  get mobilePanelFootnote(): string {
    if (this.mobilePanelHideAfterTotal) {
      return '';
    }

    if (this.isAccordionLayout && this.mobileConfirmedTab === 'cancel') {
      return this.translate.instant('BOOKING_DETAIL.CANCELLATION_POLICIES_APPLY');
    }

    if (this.mobilePanelEditable) {
      return this.hasDateChanges
        ? `✓ ${this.translate.instant('BOOKING_DETAIL.DATES_UPDATED_READY')}`
        : this.translate.instant('BOOKING_DETAIL.SELECT_NEW_DATES');
    }

    return this.translate.instant('BOOKING_DETAIL.CANCELLATION_POLICIES_APPLY');
  }

  toggleCancelAccordion(): void {
    this.isCancelAccordionOpen = !this.isCancelAccordionOpen;
    if (this.isCancelAccordionOpen) {
      this.isChangeDatesAccordionOpen = false;
    }
  }

  toggleChangeDatesAccordion(): void {
    this.isChangeDatesAccordionOpen = !this.isChangeDatesAccordionOpen;
    if (this.isChangeDatesAccordionOpen) {
      this.isCancelAccordionOpen = false;
    }
  }

  async onCancelBooking(): Promise<void> {
    if (!this.currentReservation || this.isReservationCancellationBlocked()) {
      this.showAlert(
        this.translate.instant('BOOKING_DETAIL.ALERT_CANCELLATION_UNAVAILABLE_TITLE'),
        this.translate.instant('BOOKING_DETAIL.ALERT_CANCELLATION_UNAVAILABLE_BODY'),
        'warning',
      );
      return;
    }

    this.isCancellationPolicyLoading = true;

    try {
      const policy = await firstValueFrom(
        this.bookingService.getCancellationPolicy(this.currentReservation.id, this.authSessionService.idToken),
      );

      if (this.isCancellationDeadlineExpired(policy.cancellation_deadline)) {
        this.showAlert(
          this.translate.instant('BOOKING_DETAIL.ALERT_CANCELLATION_UNAVAILABLE_TITLE'),
          this.translate.instant('BOOKING_DETAIL.ALERT_DEADLINE_EXPIRED_BODY'),
          'warning',
        );
        return;
      }

      this.cancelConfirmMessage = this.buildCancellationPolicyMessage(policy);
      this.isCancelConfirmOpen = true;
    } catch (error) {
      const httpError = error as HttpErrorResponse;
      let message = this.translate.instant('BOOKING_DETAIL.ALERT_CANCELLATION_FETCH_ERROR');

      if (typeof httpError.error?.message === 'string') {
        message = httpError.error.message;
      } else if (typeof httpError.error?.detail === 'string') {
        message = httpError.error.detail;
      }

      this.showAlert(
        this.translate.instant('BOOKING_DETAIL.ALERT_CANCELLATION_UNAVAILABLE_TITLE'),
        message,
        'error',
      );
    } finally {
      this.isCancellationPolicyLoading = false;
    }
  }

  async onCancelConfirmed(): Promise<void> {
    if (!this.currentReservation || this.isReservationCancellationBlocked()) {
      return;
    }

    this.isCancelling = true;
    this.isCancelConfirmOpen = false;

    try {
      await firstValueFrom(
        this.bookingService.cancelReservation(this.currentReservation.id, this.authSessionService.idToken),
      );

      this.shouldNavigateToBookingList = true;
      this.showAlert(
        this.translate.instant('BOOKING_DETAIL.ALERT_RESERVATION_CANCELLED_TITLE'),
        this.translate.instant('BOOKING_DETAIL.ALERT_RESERVATION_CANCELLED_BODY'),
        'success',
      );
    } catch (error) {
      const httpError = error as HttpErrorResponse;
      let message = this.translate.instant('BOOKING_DETAIL.ALERT_CANCELLATION_GENERIC_ERROR');

      if (typeof httpError.error?.message === 'string') {
        message = httpError.error.message;
      } else if (typeof httpError.error?.detail === 'string') {
        message = httpError.error.detail;
      }

      this.showAlert(
        this.translate.instant('BOOKING_DETAIL.ALERT_CANCELLATION_ERROR_TITLE'),
        message,
        'error',
      );
    } finally {
      this.isCancelling = false;
    }
  }

  async onRecalculatePrice(): Promise<void> {
    if (!this.currentReservation) {
      this.showAlert(
        this.translate.instant('BOOKING_DETAIL.ALERT_RECALCULATE_ERROR_TITLE'),
        this.translate.instant('BOOKING_DETAIL.ALERT_RECALCULATE_MISSING'),
        'error',
      );
      return;
    }

    const newPeriodStart = this.normalizeDateForApi(this.paymentSummary.checkInValue);
    const newPeriodEnd = this.normalizeDateForApi(this.paymentSummary.checkOutValue);

    if (!newPeriodStart || !newPeriodEnd) {
      this.showAlert(
        this.translate.instant('BOOKING_DETAIL.ALERT_INVALID_DATES_TITLE'),
        this.translate.instant('BOOKING_DETAIL.ALERT_INVALID_DATES_BODY'),
        'warning',
      );
      return;
    }

    if (newPeriodEnd <= newPeriodStart) {
      this.showAlert(
        this.translate.instant('BOOKING_DETAIL.ALERT_INVALID_RANGE_TITLE'),
        this.translate.instant('BOOKING_DETAIL.ALERT_INVALID_RANGE_BODY'),
        'warning',
      );
      return;
    }

    const updatedGuests = Number.parseInt(String(this.paymentSummary.guestsValue || '').trim(), 10);
    if (!Number.isFinite(updatedGuests) || updatedGuests <= 0) {
      this.showAlert(
        this.translate.instant('BOOKING_DETAIL.ALERT_INVALID_GUESTS_TITLE'),
        this.translate.instant('BOOKING_DETAIL.ALERT_INVALID_GUESTS_BODY'),
        'warning',
      );
      return;
    }

    if (!this.hasReservationChanges(newPeriodStart, newPeriodEnd, updatedGuests)) {
      this.showAlert(
        this.translate.instant('BOOKING_DETAIL.ALERT_NO_CHANGES_TITLE'),
        this.translate.instant('BOOKING_DETAIL.ALERT_NO_CHANGES_BODY'),
        'info',
      );
      return;
    }

    this.isRecalculating = true;

    try {
      const response = await firstValueFrom(
        this.bookingService.updateOrchestratedReservationDates(
          this.currentReservation.id,
          {
            new_period_start: newPeriodStart,
            new_period_end: newPeriodEnd,
            new_price: this.previewedNewPrice ?? 0,
          },
          this.authSessionService.idToken,
        ),
      );

      const parsedDifference = Number(response.price_difference);
      const priceDifference = Number.isFinite(parsedDifference) ? parsedDifference : 0;

      this.currentReservation = {
        ...this.currentReservation,
        period_start: response.period_start,
        period_end: response.period_end,
        guests: updatedGuests,
        price: Number(response.price),
        status: response.status,
      };

      this.shouldNavigateToBookingList = true;
      this.showAlert(
        this.translate.instant('BOOKING_DETAIL.ALERT_DATES_UPDATED_TITLE'),
        this.translate.instant('BOOKING_DETAIL.ALERT_DATES_UPDATED_BODY', {
          difference: this.formatAmountWithDecimals(priceDifference, '$'),
        }),
        'success',
      );
      this.hasDateChanges = false;
      this.isChangeDatesAccordionOpen = false;
    } catch (error: unknown) {
      const httpError = error as HttpErrorResponse;
      let message = this.translate.instant('BOOKING_DETAIL.ALERT_RECALCULATE_GENERIC');

      if (httpError.status === 409) {
        message = this.translate.instant('BOOKING_DETAIL.ALERT_RECALCULATE_CONFLICT');
      } else if (typeof httpError.error?.message === 'string') {
        message = httpError.error.message;
      } else if (typeof httpError.error?.detail === 'string') {
        message = httpError.error.detail;
      }

      this.showAlert(this.translate.instant('BOOKING_DETAIL.ALERT_RECALCULATE_ERROR_TITLE'), message, 'error');
    } finally {
      this.isRecalculating = false;
    }
  }

  onCheckInChanged(newDate: string): void {
    this.paymentSummary.checkInValue = newDate;
    this.hasDateChanges = true;
    this.triggerPricing();
  }

  onCheckOutChanged(newDate: string): void {
    this.paymentSummary.checkOutValue = newDate;
    this.hasDateChanges = true;
    this.triggerPricing();
  }

  onGuestsChanged(newGuests: string): void {
    this.paymentSummary.guestsValue = this.sanitizeGuestsValue(newGuests);
    this.hasDateChanges = true;
    this.triggerPricing();
  }

  onMobilePanelAction(): void {
    const normalizedStatus = (this.bookingStatus || '').trim().toUpperCase();

    if (normalizedStatus === 'UPCOMING') {
      void this.onCancelBooking();
      return;
    }

    if (normalizedStatus === 'CONFIRMED') {
      if (this.mobileConfirmedTab === 'cancel') {
        void this.onCancelBooking();
      } else {
        this.onRecalculatePrice();
      }
      return;
    }

    if (normalizedStatus === 'REJECTED') {
      this.onRecalculatePrice();
    }
  }

  onMobileConfirmedTabSelected(tabId: string): void {
    if (tabId === 'change-dates' || tabId === 'cancel') {
      this.mobileConfirmedTab = tabId;
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateViewportFlags();
  }

  private updateViewportFlags(): void {
    if (typeof window === 'undefined') {
      this.isMobileViewport = false;
      return;
    }

    this.isMobileViewport = window.matchMedia('(max-width: 720px)').matches;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onAlertDismissed(): void {
    this.isAlertOpen = false;
    if (this.shouldNavigateToBookingList) {
      this.shouldNavigateToBookingList = false;
      void this.router.navigate(['/booking-list']);
    }
  }

  private triggerPricing(): void {
    const propertyId = this.currentReservation?.property_id || '';
    const checkIn = this.normalizeDateForApi(this.paymentSummary.checkInValue);
    const checkOut = this.normalizeDateForApi(this.paymentSummary.checkOutValue);

    if (propertyId && checkIn && checkOut) {
      this.priceTrigger$.next();
    }
  }

  private async loadPropertyDetail(
    propertyId: string,
    reservation: Reservation,
    hotel?: Hotel,
  ): Promise<void> {
    const detail = await firstValueFrom(this.propertyDetailService.getPropertyDetail(propertyId));
    // Pre-cache property images for offline access (await to ensure images are cached before display)
    if (detail.photos && detail.photos.length > 0) {
      await this.imageCache.cacheImages(detail.photos);
    }
    this.applyBookingDetail(reservation, detail, hotel);
  }

  private applyBookingDetail(detailReservation: Reservation, propertyDetail: PropertyDetail, hotel?: Hotel): void {
    this.currentReservation = detailReservation;

    const locationParts = [hotel?.city || propertyDetail.city, hotel?.country || propertyDetail.country]
      .filter((part) => Boolean(part))
      .map((part) => String(part).trim())
      .filter((part) => Boolean(part));
    const location = locationParts.length ? locationParts.join(', ') : 'Location unavailable';
    const ratingValue = Number.isFinite(hotel?.rating)
      ? Number(hotel?.rating)
      : this.getAverageReviewRating(propertyDetail);
    const ratingText = ratingValue !== null ? ratingValue.toFixed(1) : 'N/A';
    const reviewCountText = propertyDetail.reviews.length ? `${propertyDetail.reviews.length} reviews` : 'No reviews yet';
    const currency = hotel?.currency || '$';
    const totalPrice = Number.isFinite(detailReservation.price) ? Number(detailReservation.price) : 0;
    const nights = this.getNightsBetween(detailReservation.period_start, detailReservation.period_end) || 1;
    const serviceFee = Math.max(0, Math.round(totalPrice * 0.045));
    const taxes = Math.max(0, Math.round(totalPrice * 0.066));
    const stayTotal = Math.max(0, totalPrice - serviceFee - taxes);
    const nightlyPrice = nights > 0 ? Math.max(0, Math.round(stayTotal / nights)) : stayTotal;

    const photos = Array.isArray(propertyDetail.photos) ? propertyDetail.photos : [];
    const images: ThDetailsMosaicImage[] = photos.map((photo) => ({ src: this.imageCache.resolveImageUrl(photo) }));
    if (!images.length && hotel?.photos?.[0]) {
      images.push({ src: this.imageCache.resolveImageUrl(hotel.photos[0]), alt: propertyDetail.name || 'Property photo' });
    }

    if (!images.length && hotel?.imageUrl) {
      images.push({ src: this.imageCache.resolveImageUrl(hotel.imageUrl), alt: propertyDetail.name || 'Property photo' });
    }

    this.property = {
      title: propertyDetail.name || hotel?.name || 'Property',
      location,
      price: this.formatAmount(nightlyPrice, currency),
      rating: ratingText,
      score: ratingText,
      scoreLabel: ratingValue !== null ? this.getScoreLabel(ratingValue) : 'Unrated',
      reviewsText: reviewCountText,
      stars: ratingValue !== null ? Math.round(ratingValue) : 0,
      imageUrl: this.imageCache.resolveImageUrl(hotel?.photos?.[0] || hotel?.imageUrl || ''),
      totalPhotos: photos.length,
      images,
    };

    this.rawBookingStatus = detailReservation.status || this.rawBookingStatus;
    this.bookingStatus = this.getBookingStatusLabel(this.rawBookingStatus);
    this.bookingStatusVariant = this.getBookingStatusVariant(this.rawBookingStatus);
    this.bookingDateRange = this.formatBookingDateRange(
      detailReservation.period_start,
      detailReservation.period_end,
    );
    this.bookingNights = `${nights} ${nights === 1 ? 'night' : 'nights'}`;

    this.descriptionParagraphs = propertyDetail.description ? [propertyDetail.description] : [];
    this.amenities = (propertyDetail.amenities || []).map((amenity) => ({
      label: amenity.description || 'Amenity',
      icon: this.getAmenityIcon(amenity.description),
    }));

    this.guestReviews = (propertyDetail.reviews || []).map((review) => ({
      name: review.name || 'Guest',
      locationAndDate: 'Verified guest',
      relativeDate: '',
      text: review.description || '',
      avatarUrl: '',
      score: Number.isFinite(review.rating) ? Number(review.rating).toFixed(1) : '0.0',
      stars: Number.isFinite(review.rating) ? Math.round(review.rating) : 0,
    }));

    this.reviewCategoryScores = [];
    this.summaryItems = [
      {
        label: `${this.formatAmount(nightlyPrice, currency)} × ${nights} nights`,
        amount: this.formatAmount(stayTotal, currency),
      },
      {
        label: 'Service fee',
        amount: this.formatAmount(serviceFee, currency),
        muted: true,
      },
      {
        label: 'Taxes',
        amount: this.formatAmount(taxes, currency),
        muted: true,
      },
    ];

    this.paymentSummary = {
      title: this.formatAmount(nightlyPrice, currency),
      subtitle: 'per night',
      promoText: 'Reservation details',
      checkInValue: detailReservation.period_start,
      checkOutValue: detailReservation.period_end,
      guestsValue: String(detailReservation.guests || ''),
      roomTypeValue: 'Standard Room',
      totalAmount: this.formatAmount(totalPrice, currency),
    };

    this.mobileConfirmedTab = 'cancel';

    this.paymentSummaryResetVersion += 1;
    this.hasDateChanges = false;
  }

  private getBookingId(navState: Record<string, unknown> | undefined): string {
    const stateBookingId = navState?.['bookingId'] ?? navState?.['reservationId'] ?? navState?.['id'];
    const queryBookingId =
      this.route.snapshot.queryParamMap.get('bookingId') ||
      this.route.snapshot.queryParamMap.get('reservationId') ||
      this.route.snapshot.queryParamMap.get('id');
    const routeBookingId = this.route.snapshot.paramMap.get('id');

    return String(stateBookingId || queryBookingId || routeBookingId || '').trim();
  }

  private getNightsBetween(startDate?: string, endDate?: string): number {
    if (!startDate || !endDate) {
      return 0;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 0;
    }

    const diffMs = end.getTime() - start.getTime();
    const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 0;
  }

  private formatBookingDateRange(periodStart: string, periodEnd: string): string {
    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return `${periodStart} - ${periodEnd}`;
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

  private getBookingStatusVariant(status: string): ThDetailSummaryStatusVariant {
    const normalizedStatus = (status || '').trim().toUpperCase();

    switch (normalizedStatus) {
      case 'PENDING':
      case 'UPCOMING':
        return 'pending';
      case 'CONFIRMED':
        return 'confirmed';
      case 'COMPLETED':
        return 'completed';
      case 'REJECTED':
        return 'rejected';
      case 'CANCELED':
      case 'CANCELLED':
        return 'canceled';
      default:
        return 'default';
    }
  }

  private getAverageReviewRating(propertyDetail: PropertyDetail): number | null {
    const reviewRatings = (propertyDetail.reviews || [])
      .map((review) => Number(review.rating))
      .filter((rating) => Number.isFinite(rating));

    if (!reviewRatings.length) {
      return null;
    }

    return reviewRatings.reduce((sum, value) => sum + value, 0) / reviewRatings.length;
  }

  private formatAmount(value: number, currency: string): string {
    const safeValue = Number.isFinite(value) ? value : 0;
    const formattedValue = new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(safeValue);

    return `${currency}${formattedValue}`;
  }

  private formatAmountWithDecimals(value: number, currency: string): string {
    const safeValue = Number.isFinite(value) ? value : 0;
    const formattedValue = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: safeValue % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(safeValue);

    return `${currency}${formattedValue}`;
  }

  private normalizeDateForApi(value: string): string | null {
    const trimmed = String(value || '').trim();
    if (!trimmed) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
    if (!ddmmyyyy) {
      return null;
    }

    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month}-${day}`;
  }

  private getCheckInApiUrl(path: string): string {
    const baseUrl = this.configService.apiBaseUrl?.replace(/\/$/, '');
    const normalizedPath = path.replace(/^\//, '');

    return baseUrl ? `${baseUrl}/${normalizedPath}` : `/${normalizedPath}`;
  }

  private hasReservationChanges(newPeriodStart: string, newPeriodEnd: string, newGuests: number): boolean {
    if (!this.currentReservation) {
      return false;
    }

    const originalPeriodStart = this.normalizeDateForApi(this.currentReservation.period_start) || this.currentReservation.period_start;
    const originalPeriodEnd = this.normalizeDateForApi(this.currentReservation.period_end) || this.currentReservation.period_end;
    const originalGuests = Number(this.currentReservation.guests);

    return (
      originalPeriodStart !== newPeriodStart ||
      originalPeriodEnd !== newPeriodEnd ||
      originalGuests !== newGuests
    );
  }

  private sanitizeGuestsValue(value: string): string {
    return String(value || '').replace(/\D+/g, '');
  }

  private getScoreLabel(score: number): string {
    if (score >= 4.7) {
      return 'Exceptional';
    }

    if (score >= 4.2) {
      return 'Excellent';
    }

    if (score >= 3.5) {
      return 'Very good';
    }

    if (score >= 3.0) {
      return 'Good';
    }

    return 'Fair';
  }

  private getAmenityIcon(description?: string): string {
    const text = (description || '').toLowerCase();

    if (text.includes('wifi')) {
      return 'wifi-outline';
    }

    if (text.includes('parking')) {
      return 'car-outline';
    }

    if (text.includes('pool')) {
      return 'water-outline';
    }

    if (text.includes('gym') || text.includes('fitness')) {
      return 'barbell-outline';
    }

    if (text.includes('restaurant')) {
      return 'restaurant-outline';
    }

    if (text.includes('spa')) {
      return 'flower-outline';
    }

    if (text.includes('air')) {
      return 'snow-outline';
    }

    if (text.includes('room')) {
      return 'cafe-outline';
    }

    return 'checkmark-circle-outline';
  }

  private isReservationCancellationBlocked(): boolean {
    if (!this.currentReservation) {
      return false;
    }

    const normalizedStatus = this.currentReservation.status.trim().toUpperCase();
    return (
      normalizedStatus === 'CANCELED' ||
      normalizedStatus === 'CANCELLED' ||
      normalizedStatus === 'COMPLETED'
    );
  }

  private buildCancellationPolicyMessage(policy: CancellationPolicyResponse): string {
    const penalty = this.parsePolicyAmount(policy.penalty_amount);
    const refund = this.parsePolicyAmount(policy.refund_amount);
    const currency = this.getCurrencySymbol();
    const penaltyText = this.formatMoneyAmount(penalty, currency);
    const refundText = this.formatMoneyAmount(refund, currency);

    if (policy.is_free_cancellation) {
      if (penalty > 0) {
        return this.translate.instant('BOOKING_DETAIL.POLICY_FREE_PENALTY', { penalty: penaltyText, refund: refundText });
      }

      if (refund > 0) {
        return this.translate.instant('BOOKING_DETAIL.POLICY_FREE_REFUND', { refund: refundText });
      }

      return this.translate.instant('BOOKING_DETAIL.POLICY_FREE_NONE');
    }

    if (penalty > 0 && refund > 0) {
      return this.translate.instant('BOOKING_DETAIL.POLICY_PAID_BOTH', { penalty: penaltyText, refund: refundText });
    }

    if (penalty > 0) {
      return this.translate.instant('BOOKING_DETAIL.POLICY_PAID_PENALTY', { penalty: penaltyText });
    }

    if (refund > 0) {
      return this.translate.instant('BOOKING_DETAIL.POLICY_PAID_REFUND', { refund: refundText });
    }

    return this.translate.instant('BOOKING_DETAIL.POLICY_PAID_NONE');
  }

  private isCancellationDeadlineExpired(deadline: string): boolean {
    const parsed = new Date(deadline);
    if (Number.isNaN(parsed.getTime())) {
      return false;
    }

    return parsed.getTime() < Date.now();
  }

  private parsePolicyAmount(value: string): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private formatMoneyAmount(value: number, currency: string): string {
    const safe = Number.isFinite(value) ? value : 0;
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe);

    return `${currency}${formatted}`;
  }

  private getCurrencySymbol(): string {
    const symbol = (this.property.price || '').trim().charAt(0);
    return symbol || '$';
  }

  private showAlert(title: string, message: string, variant: ThPopupVariant = 'info'): void {
    this.alertTitle = title;
    this.alertMessage = message;
    this.alertVariant = variant;
    this.isAlertOpen = true;
  }

  async openCameraForCheckin(): Promise<void> {
    try {
      // Use @capacitor/barcode-scanner to read QR codes for check-in
      const result = await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
      });

      if (!result || !result.ScanResult) {
        this.showAlert(this.translate.instant('BOOKING_DETAIL.CHECKIN_TITLE'), this.translate.instant('BOOKING_DETAIL.CHECKIN_NO_CODE_BODY'), 'warning');
        return;
      }

      const qrData = result.ScanResult;

      const bookingId = this.currentReservation?.id || this.getBookingId(undefined);
      if (!bookingId) {
        this.showAlert(this.translate.instant('BOOKING_DETAIL.CHECKIN_TITLE'), this.translate.instant('BOOKING_DETAIL.CHECKIN_NO_BOOKING_BODY'), 'error');
        return;
      }

      if (this.currentReservation?.status?.trim().toUpperCase() !== 'CONFIRMED') {
        this.showAlert(this.translate.instant('BOOKING_DETAIL.CHECKIN_TITLE'), 'Booking must be CONFIRMED to check in', 'warning');
        return;
      }

      try {
        this.isCheckInSubmitting = true;
        const url = this.getCheckInApiUrl('checkin/api/check-in/');
        const response = await firstValueFrom(
          this.httpClient.post<{ status?: string }>(
            url,
            { booking_id: bookingId, qr_token: qrData },
            {
              headers: {
                Authorization: `Bearer ${this.authSessionService.idToken}`,
              },
            },
          ),
        );

        if (response && String(response.status).toUpperCase() === 'COMPLETED') {
          // Update booking status to COMPLETED on successful check-in
          if (this.currentReservation) {
            this.currentReservation.status = 'COMPLETED';
          }
          this.rawBookingStatus = 'COMPLETED';
          this.bookingStatus = this.getBookingStatusLabel('COMPLETED');
          this.bookingStatusVariant = this.getBookingStatusVariant('COMPLETED');
          this.showAlert(
            this.translate.instant('BOOKING_DETAIL.CHECKIN_SUCCESS_TITLE'),
            this.translate.instant('BOOKING_DETAIL.CHECKIN_SUCCESS_BODY'),
            'success',
          );
        } else {
          this.showAlert(
            this.translate.instant('BOOKING_DETAIL.CHECKIN_TITLE'),
            this.translate.instant('BOOKING_DETAIL.CHECKIN_FAILED_BODY'),
            'error',
          );
        }
      } catch (httpErr) {
        const httpError = httpErr as any;
        let message = this.translate.instant('BOOKING_DETAIL.CHECKIN_ERROR_BODY');
        if (httpError?.error?.message) {
          message = httpError.error.message;
        } else if (httpError?.message) {
          message = httpError.message;
        }

        this.showAlert(this.translate.instant('BOOKING_DETAIL.CHECKIN_ERROR_TITLE'), message, 'error');
      } finally {
        this.isCheckInSubmitting = false;
      }
    } catch (err) {
      this.showAlert(this.translate.instant('BOOKING_DETAIL.CHECKIN_SCANNER_ERROR_TITLE'), this.translate.instant('BOOKING_DETAIL.CHECKIN_SCANNER_ERROR_BODY'), 'error');
    }
  }
}
