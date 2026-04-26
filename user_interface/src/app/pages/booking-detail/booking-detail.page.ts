import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { firstValueFrom, Subject, of, EMPTY } from 'rxjs';
import { switchMap, takeUntil, tap, catchError } from 'rxjs/operators';
import { Hotel } from '../../core/models/hotel.model';
import { PropertyDetail } from '../../core/models/property-detail.model';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { BookingService, CancellationPolicyResponse, Reservation } from '../../core/services/booking.service';
import { PropertyDetailService } from '../../core/services/property-detail.service';
import { PricingService } from '../../core/services/pricing.service';
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

@Component({
  selector: 'app-booking-detail',
  templateUrl: './booking-detail.page.html',
  styleUrls: ['./booking-detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
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
    private pricingService: PricingService,
    private route: ActivatedRoute,
    private router: Router,
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
            this.pricingError = 'Unable to calculate price. Please try again.';
            return of(null);
          }),
        );
      }),
    ).subscribe();
  }

  async ngOnInit(): Promise<void> {
    this.hasInitialized = true;
    await this.refreshPageData();
  }

  ionViewWillEnter(): void {
    if (!this.hasInitialized) {
      return;
    }

    void this.refreshPageData();
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

    if (stateBookingStatus) {
      this.bookingStatus = stateBookingStatus;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      if (stateReservation && statePropertyDetail) {
        this.applyBookingDetail(stateReservation, statePropertyDetail, stateHotel);
        return;
      }

      if (stateReservation) {
        await this.loadPropertyDetail(stateReservation.property_id, stateReservation, stateHotel);
        return;
      }

      if (!bookingId) {
        this.errorMessage = 'Unable to load booking details.';
        return;
      }

      const reservation = await firstValueFrom(
        this.bookingService.getReservation(bookingId, this.authSessionService.idToken),
      );
      await this.loadPropertyDetail(reservation.property_id, reservation, stateHotel);
    } catch (error) {
      this.errorMessage = 'Unable to load booking details.';
    } finally {
      this.isLoading = false;
      this.isRefreshingPageData = false;
    }
  }

  get isAccordionLayout(): boolean {
    const normalizedStatus = (this.bookingStatus || '').trim().toUpperCase();
    return normalizedStatus === 'CONFIRMED';
  }

  get isFlatEditableLayout(): boolean {
    const normalizedStatus = (this.bookingStatus || '').trim().toUpperCase();
    return normalizedStatus === 'UPCOMING' || normalizedStatus === 'REJECTED';
  }

  get isEditableStatus(): boolean {
    return this.isAccordionLayout || this.isFlatEditableLayout;
  }

  get isFlatCancelLayout(): boolean {
    const normalizedStatus = (this.bookingStatus || '').trim().toUpperCase();
    return normalizedStatus === 'UPCOMING';
  }

  get isFlatChangeDatesLayout(): boolean {
    const normalizedStatus = (this.bookingStatus || '').trim().toUpperCase();
    return normalizedStatus === 'REJECTED';
  }

  get showCancelAccordion(): boolean {
    const normalizedStatus = (this.bookingStatus || '').trim().toUpperCase();
    return normalizedStatus === 'CONFIRMED';
  }

  get showChangeDatesAccordion(): boolean {
    const normalizedStatus = (this.bookingStatus || '').trim().toUpperCase();
    return normalizedStatus === 'CONFIRMED';
  }

  get isCancellationHiddenForStatus(): boolean {
    const normalizedStatus = (this.bookingStatus || '').trim().toUpperCase();
    return normalizedStatus === 'CANCELED' || normalizedStatus === 'CANCELLED' || normalizedStatus === 'COMPLETED';
  }

  get showMobileStickyPanel(): boolean {
    return this.isMobileViewport;
  }

  get mobilePanelTabs(): ThPaymentSummaryCompactTab[] {
    if (this.isAccordionLayout) {
      return [
        { id: 'cancel', label: 'Cancel Reservation' },
        { id: 'change-dates', label: 'Change Dates' },
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
      return 'Cancel Reservation';
    }

    if (normalizedStatus === 'CONFIRMED') {
      return this.mobileConfirmedTab === 'change-dates' ? 'Recalculate Price' : 'Cancel Reservation';
    }

    if (normalizedStatus === 'REJECTED') {
      return 'Recalculate Price';
    }

    return 'Cancel';
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
      return this.mobileConfirmedTab === 'change-dates' ? 'Update Your Dates' : 'Reservation details';
    }

    return this.mobilePanelEditable ? 'Update Your Dates' : 'Reservation details';
  }

  get mobilePanelFootnote(): string {
    if (this.mobilePanelHideAfterTotal) {
      return '';
    }

    if (this.isAccordionLayout && this.mobileConfirmedTab === 'cancel') {
      return 'Cancellation policies may apply';
    }

    if (this.mobilePanelEditable) {
      return this.hasDateChanges ? '✓ Dates updated - ready to recalculate' : 'Select new dates to update';
    }

    return 'Cancellation policies may apply';
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
      this.showAlert('Cancellation unavailable', 'This reservation can no longer be cancelled.', 'warning');
      return;
    }

    this.isCancellationPolicyLoading = true;

    try {
      const policy = await firstValueFrom(
        this.bookingService.getCancellationPolicy(this.currentReservation.id, this.authSessionService.idToken),
      );

      if (this.isCancellationDeadlineExpired(policy.cancellation_deadline)) {
        this.showAlert(
          'Cancellation unavailable',
          'The cancellation deadline has passed. This reservation can no longer be cancelled.',
          'warning',
        );
        return;
      }

      this.cancelConfirmMessage = this.buildCancellationPolicyMessage(policy);
      this.isCancelConfirmOpen = true;
    } catch (error) {
      const httpError = error as HttpErrorResponse;
      let message = 'Unable to retrieve cancellation policy. Please try again.';

      if (typeof httpError.error?.message === 'string') {
        message = httpError.error.message;
      } else if (typeof httpError.error?.detail === 'string') {
        message = httpError.error.detail;
      }

      this.showAlert('Cancellation unavailable', message, 'error');
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
      this.showAlert('Reservation Cancelled', 'Your reservation has been cancelled successfully.', 'success');
    } catch (error) {
      const httpError = error as HttpErrorResponse;
      let message = 'Unable to cancel reservation. Please try again.';

      if (typeof httpError.error?.message === 'string') {
        message = httpError.error.message;
      } else if (typeof httpError.error?.detail === 'string') {
        message = httpError.error.detail;
      }

      this.showAlert('Cancellation Error', message, 'error');
    } finally {
      this.isCancelling = false;
    }
  }

  async onRecalculatePrice(): Promise<void> {
    if (!this.currentReservation) {
      this.showAlert('Error', 'Unable to recalculate price. Reservation data is missing.', 'error');
      return;
    }

    const newPeriodStart = this.normalizeDateForApi(this.paymentSummary.checkInValue);
    const newPeriodEnd = this.normalizeDateForApi(this.paymentSummary.checkOutValue);

    if (!newPeriodStart || !newPeriodEnd) {
      this.showAlert('Invalid dates', 'Please select valid check-in and check-out dates.', 'warning');
      return;
    }

    if (newPeriodEnd <= newPeriodStart) {
      this.showAlert('Invalid date range', 'Check-out date must be later than check-in date.', 'warning');
      return;
    }

    const updatedGuests = Number.parseInt(String(this.paymentSummary.guestsValue || '').trim(), 10);
    if (!Number.isFinite(updatedGuests) || updatedGuests <= 0) {
      this.showAlert('Invalid guests', 'Please enter a valid number of guests.', 'warning');
      return;
    }

    if (!this.hasReservationChanges(newPeriodStart, newPeriodEnd, updatedGuests)) {
      this.showAlert(
        'No changes detected',
        'Please change check-in, check-out, or guests before updating the reservation.',
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
        'Dates Updated',
        `Reservation dates updated successfully. Price difference: ${this.formatAmountWithDecimals(priceDifference, '$')}.`,
        'success',
      );
      this.hasDateChanges = false;
      this.isChangeDatesAccordionOpen = false;
    } catch (error: unknown) {
      const httpError = error as HttpErrorResponse;
      let message = 'Unable to recalculate price. Please try again.';

      if (httpError.status === 409) {
        message = 'The property is not available for the selected dates. Please choose different dates.';
      } else if (typeof httpError.error?.message === 'string') {
        message = httpError.error.message;
      } else if (typeof httpError.error?.detail === 'string') {
        message = httpError.error.detail;
      }

      this.showAlert('Error', message, 'error');
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
    const images: ThDetailsMosaicImage[] = photos.map((photo) => ({ src: photo }));
    if (!images.length && hotel?.photos?.[0]) {
      images.push({ src: hotel.photos[0], alt: propertyDetail.name || 'Property photo' });
    }

    if (!images.length && hotel?.imageUrl) {
      images.push({ src: hotel.imageUrl, alt: propertyDetail.name || 'Property photo' });
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
      imageUrl: hotel?.photos?.[0] || hotel?.imageUrl || '',
      totalPhotos: photos.length,
      images,
    };

    this.bookingStatus = this.getBookingStatusLabel(detailReservation.status || this.bookingStatus);
    this.bookingStatusVariant = this.getBookingStatusVariant(detailReservation.status || this.bookingStatus);
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

  private getBookingStatusLabel(status: string): string {
    const normalizedStatus = (status || '').trim().toUpperCase();

    switch (normalizedStatus) {
      case 'PENDING':
        return 'Upcoming';
      case 'CONFIRMED':
        return 'Confirmed';
      case 'COMPLETED':
        return 'Completed';
      case 'CANCELED':
      case 'CANCELLED':
        return 'Canceled';
      default:
        return normalizedStatus ? normalizedStatus.charAt(0) + normalizedStatus.slice(1).toLowerCase() : 'Upcoming';
    }
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
    const deadlineText = this.formatCancellationDeadline(policy.cancellation_deadline);

    if (policy.is_free_cancellation) {
      if (penalty > 0) {
        return `Cancellation is free according to your policy. A penalty of ${penaltyText} is reported and your refund will be ${refundText}. Would you like to continue?`;
      }

      if (refund > 0) {
        return `Cancellation is free. You will receive a refund of ${refundText}. Would you like to continue?`;
      }

      return `Cancellation is free. Would you like to continue?`;
    }

    if (penalty > 0 && refund > 0) {
      return `Cancellation is not free. A penalty of ${penaltyText} will be applied and your refund will be ${refundText}. Would you like to continue?`;
    }

    if (penalty > 0) {
      return `Cancellation is not free. A penalty of ${penaltyText} will be applied and no refund will be issued. Would you like to continue?`;
    }

    if (refund > 0) {
      return `Cancellation is not free. Your refund amount will be ${refundText}. Would you like to continue?`;
    }

    return `Cancellation is not free and no refund will be issued. Would you like to continue?`;
  }

  private isCancellationDeadlineExpired(deadline: string): boolean {
    const parsed = new Date(deadline);
    if (Number.isNaN(parsed.getTime())) {
      return false;
    }

    return parsed.getTime() < Date.now();
  }

  private formatCancellationDeadline(deadline: string): string {
    const parsed = new Date(deadline);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(parsed);
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
}
