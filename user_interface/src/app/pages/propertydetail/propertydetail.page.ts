import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, Subject, of, EMPTY } from 'rxjs';
import { switchMap, takeUntil, tap, catchError } from 'rxjs/operators';
import { ThAmenityItem } from '../../shared/components/th-amenities-summary/th-amenities-summary.component';
import { ThDetailsMosaicImage } from '../../shared/components/th-details-mosaic/th-details-mosaic.component';
import { ThPaymentSummaryBadge, ThPaymentSummaryItem } from '../../shared/components/th-payment-summary/th-payment-summary.component';
import { ThGuestReviewItem, ThReviewCategoryScore } from '../../shared/components/th-property-review-summary/th-property-review-summary.component';
import { PropertyDetailService } from '../../core/services/property-detail.service';
import { PropertyDetail } from '../../core/models/property-detail.model';
import { Hotel } from '../../core/models/hotel.model';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { BookingService, ReservationRequest } from '../../core/services/booking.service';
import { PendingBookingService } from '../../core/services/pending-booking.service';
import { PricingService } from '../../core/services/pricing.service';
import { ThPopupVariant } from '../../shared/components/th-popup/th-popup.component';

@Component({
  selector: 'app-propertydetail',
  templateUrl: './propertydetail.page.html',
  styleUrls: ['./propertydetail.page.scss'],
  standalone: false,
})
export class PropertydetailPage implements OnInit, OnDestroy {
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

  summaryBadges: ThPaymentSummaryBadge[] = [
    { text: 'Free cancellation', variant: 'success', icon: 'checkmark-circle' },
    { text: 'Best price', variant: 'info', icon: 'sparkles-outline' },
  ];

  descriptionParagraphs: string[] = [];

  amenities: ThAmenityItem[] = [];

  reviewCategoryScores: ThReviewCategoryScore[] = [];

  guestReviews: ThGuestReviewItem[] = [];

  isLoading = false;
  isBooking = false;
  errorMessage = '';

  bookingErrors = {
    checkIn: '',
    checkOut: '',
    guests: '',
  };

  isAlertOpen = false;
  alertTitle = '';
  alertMessage = '';
  alertVariant: ThPopupVariant = 'info';
  private bookingSuccess = false;

  paymentSummary = {
    title: '$0',
    subtitle: 'per night',
    promoText: 'Book with confidence',
    checkInValue: '',
    checkOutValue: '',
    guestsValue: '',
    roomTypeValue: 'Standard Room',
    totalAmount: '$0',
  };

  paymentSummaryResetVersion = 0;

  priceForStay: number | null = null;
  isPricingLoading = false;
  pricingError = '';

  private currentPropertyDetail: PropertyDetail | null = null;
  private nightlyPrice = 0;
  private priceTrigger$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private propertyDetailService: PropertyDetailService,
    private bookingService: BookingService,
    private authSessionService: AuthSessionService,
    private pendingBookingService: PendingBookingService,
    private pricingService: PricingService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.priceTrigger$.pipe(
      takeUntil(this.destroy$),
      switchMap(() => {
        const propertyId = this.currentPropertyDetail?.id || this.route.snapshot.paramMap.get('id') || '';
        const checkIn = this.normalizeDateForApi(this.paymentSummary.checkInValue);
        const checkOut = this.normalizeDateForApi(this.paymentSummary.checkOutValue);
        const guests = Number.parseInt(this.paymentSummary.guestsValue, 10);
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
            this.priceForStay = result.price;
            this.isPricingLoading = false;

            const nights = this.getNightsBetween(checkIn, checkOut);
            const currency = this.currentPropertyDetail ? (this.property.price.charAt(0) || '$') : '$';
            const perNight = nights > 0 ? Math.round(result.price / nights) : result.price;

            this.paymentSummary = {
              ...this.paymentSummary,
              title: `${currency}${perNight}`,
              totalAmount: `${currency}${result.price}`,
            };

            if (nights > 0) {
              this.summaryItems = [
                { label: `${currency}${perNight} x ${nights} nights`, amount: `${currency}${result.price}` },
              ];
            } else {
              this.summaryItems = [{ label: 'Base rate', amount: `${currency}${result.price}` }];
            }
          }),
          catchError((error) => {
            this.isPricingLoading = false;
            this.priceForStay = null;
            this.pricingError = 'Unable to calculate price. Please try again.';
            return of(null);
          }),
        );
      }),
    ).subscribe();
  }

  async ngOnInit(): Promise<void> {
    const navState = this.router.getCurrentNavigation()?.extras.state ?? history.state;
    const stateHotel = (navState?.['hotel'] as Hotel | undefined) ?? undefined;
    const stateDetail = (navState?.['propertyDetail'] as PropertyDetail | undefined) ?? undefined;
    const search = navState?.['search'] as { startDate?: string; endDate?: string; capacity?: number } | undefined;

    if (stateDetail) {
      this.applyPropertyDetail(stateDetail, stateHotel, search);
      return;
    }

    const propertyId = this.route.snapshot.paramMap.get('id') || stateHotel?.id;
    if (!propertyId) {
      this.errorMessage = 'Unable to load property details.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const detail = await firstValueFrom(this.propertyDetailService.getPropertyDetail(propertyId));
      this.applyPropertyDetail(detail, stateHotel, search);
    } catch (error) {
      this.errorMessage = 'Unable to load property details.';
    } finally {
      this.isLoading = false;
    }
  }

  private applyPropertyDetail(
    detail: PropertyDetail,
    hotel?: Hotel,
    search?: { startDate?: string; endDate?: string; capacity?: number },
  ): void {
    this.currentPropertyDetail = detail;

    const locationParts = [hotel?.city, hotel?.country].filter((part) => Boolean(part));
    const location = locationParts.length ? locationParts.join(', ') : 'Location unavailable';
    const priceValue = Number.isFinite(hotel?.pricePerNight) ? Number(hotel?.pricePerNight) : 0;
    this.nightlyPrice = priceValue;
    const currency = hotel?.currency || '$';
    const hotelRating = Number.isFinite(hotel?.rating) ? Number(hotel?.rating) : null;

    const photos = Array.isArray(detail.photos) ? detail.photos : [];
    const images: ThDetailsMosaicImage[] = photos.map((photo) => ({ src: photo }));
    if (!images.length && hotel?.photos?.[0]) {
      images.push({ src: hotel.photos[0], alt: detail.name || 'Property photo' });
    }

    if (!images.length && hotel?.imageUrl) {
      images.push({ src: hotel.imageUrl, alt: detail.name || 'Property photo' });
    }

    const reviews = Array.isArray(detail.reviews) ? detail.reviews : [];
    const reviewRatings = reviews
      .map((review) => Number(review.rating))
      .filter((rating) => Number.isFinite(rating));
    const averageReviewRating = reviewRatings.length
      ? reviewRatings.reduce((sum, value) => sum + value, 0) / reviewRatings.length
      : null;
    const ratingValue = hotelRating ?? averageReviewRating;
    const ratingText = ratingValue !== null ? ratingValue.toFixed(1) : 'N/A';
    const reviewCountText = reviews.length ? `${reviews.length} reviews` : 'No reviews yet';

    this.property = {
      title: detail.name || hotel?.name || 'Property',
      location,
      price: `${currency}${priceValue}`,
      rating: ratingText,
      score: ratingText,
      scoreLabel: ratingValue !== null ? this.getScoreLabel(ratingValue) : 'Unrated',
      reviewsText: reviewCountText,
      stars: ratingValue !== null ? Math.round(ratingValue) : 0,
      imageUrl: hotel?.photos?.[0] || hotel?.imageUrl || '',
      totalPhotos: photos.length,
      images,
    };

    this.descriptionParagraphs = detail.description ? [detail.description] : [];

    this.amenities = (detail.amenities || []).map((amenity) => ({
      label: amenity.description || 'Amenity',
      icon: this.getAmenityIcon(amenity.description),
    }));

    this.guestReviews = reviews.map((review) => ({
      name: review.name || 'Guest',
      locationAndDate: 'Verified guest',
      relativeDate: '',
      text: review.description || '',
      avatarUrl: '',
      score: Number.isFinite(review.rating) ? Number(review.rating).toFixed(1) : '0.0',
      stars: Number.isFinite(review.rating) ? Math.round(review.rating) : 0,
    }));

    this.reviewCategoryScores = [];

    this.updatePaymentSummary(priceValue, currency, search);

    this.restorePendingBooking(detail.id);
    this.paymentSummaryResetVersion += 1;
    this.triggerPricing();
  }

  onCheckInChanged(value: string): void {
    this.paymentSummary.checkInValue = value;
    this.bookingErrors.checkIn = '';
    this.triggerPricing();
  }

  onCheckOutChanged(value: string): void {
    this.paymentSummary.checkOutValue = value;
    this.bookingErrors.checkOut = '';
    this.triggerPricing();
  }

  onGuestsChanged(value: string): void {
    this.paymentSummary.guestsValue = value;
    this.bookingErrors.guests = '';
    this.triggerPricing();
  }

  async onBookNow(): Promise<void> {
    this.resetBookingErrors();

    const normalizedCheckIn = this.normalizeDateForApi(this.paymentSummary.checkInValue);
    const normalizedCheckOut = this.normalizeDateForApi(this.paymentSummary.checkOutValue);
    const guests = Number.parseInt(this.paymentSummary.guestsValue, 10);

    if (!normalizedCheckIn) {
      this.bookingErrors.checkIn = 'Check-in date is required';
    }

    if (!normalizedCheckOut) {
      this.bookingErrors.checkOut = 'Check-out date is required';
    }

    if (normalizedCheckIn && normalizedCheckOut) {
      const checkInDate = new Date(normalizedCheckIn);
      const checkOutDate = new Date(normalizedCheckOut);
      if (checkOutDate.getTime() <= checkInDate.getTime()) {
        this.bookingErrors.checkOut = 'Check-out must be after check-in';
      }
    }

    if (!Number.isFinite(guests) || guests <= 0) {
      this.bookingErrors.guests = 'Guests must be at least 1';
    }

    if (this.hasBookingErrors()) {
      return;
    }

    if (this.priceForStay === null && normalizedCheckIn && normalizedCheckOut) {
      this.showAlert('Booking Error', 'Please wait for price calculation.', 'error');
      return;
    }

    const propertyId = this.currentPropertyDetail?.id || this.route.snapshot.paramMap.get('id') || '';
    if (!propertyId) {
      this.showAlert('Booking Error', 'Unable to identify the selected property.', 'error');
      return;
    }

    if (!this.authSessionService.isLoggedIn) {
      this.pendingBookingService.setPendingBooking({
        returnUrl: this.router.url,
        propertyId,
        checkInValue: this.paymentSummary.checkInValue,
        checkOutValue: this.paymentSummary.checkOutValue,
        guestsValue: this.paymentSummary.guestsValue,
      });

      await this.router.navigate(['/login'], {
        queryParams: {
          returnUrl: this.router.url,
        },
      });
      return;
    }

    const userId = this.authSessionService.userId;
    const userEmail = this.authSessionService.userEmail;

    if (!userId || !userEmail) {
      this.showAlert('Booking Error', 'User information is missing. Please sign in again.', 'error');
      return;
    }

    const reservationPayload: ReservationRequest = {
      property_id: propertyId,
      user_id: userId,
      user_email: userEmail,
      guests,
      period_start: normalizedCheckIn as string,
      period_end: normalizedCheckOut as string,
      price: this.priceForStay ?? this.nightlyPrice,
      admin_group_id: this.currentPropertyDetail?.adminGroupId || '',
    };

    this.isBooking = true;
    try {
      await firstValueFrom(
        this.bookingService.createReservation(
          reservationPayload,
          this.authSessionService.idToken,
        ),
      );

      this.bookingSuccess = true;
  this.showAlert('Reservation Created', 'Your booking request was sent successfully.', 'success');
      this.pendingBookingService.clearPendingBooking();
    } catch (error) {
      this.bookingSuccess = false;
      const httpError = error as HttpErrorResponse;
      let message = 'Unable to create reservation. Please try again.';

      if (httpError.status === 409 && httpError.error?.detail === 'property_unavailable') {
        message = 'This property is no longer available. Please select another property.';
      } else if (typeof httpError.error?.message === 'string') {
        message = httpError.error.message;
      } else if (typeof httpError.error?.detail === 'string') {
        message = httpError.error.detail;
      }

      this.showAlert('Booking Error', message, 'error');
    } finally {
      this.isBooking = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private triggerPricing(): void {
    const propertyId = this.currentPropertyDetail?.id || this.route.snapshot.paramMap.get('id') || '';
    const checkIn = this.normalizeDateForApi(this.paymentSummary.checkInValue);
    const checkOut = this.normalizeDateForApi(this.paymentSummary.checkOutValue);

    if (propertyId && checkIn && checkOut) {
      this.priceTrigger$.next();
    }
  }

  private updatePaymentSummary(
    priceValue: number,
    currency: string,
    search?: { startDate?: string; endDate?: string; capacity?: number },
  ): void {
    const nights = this.getNightsBetween(search?.startDate, search?.endDate);
    const total = nights > 0 ? priceValue * nights : priceValue;
    const guestsValue = search?.capacity ? String(search.capacity) : '';

    this.paymentSummary = {
      title: `${currency}${priceValue}`,
      subtitle: 'per night',
      promoText: 'Book with confidence',
      checkInValue: search?.startDate || '',
      checkOutValue: search?.endDate || '',
      guestsValue,
      roomTypeValue: 'Standard Room',
      totalAmount: `${currency}${total}`,
    };

    if (nights > 0) {
      this.summaryItems = [
        { label: `${currency}${priceValue} × ${nights} nights`, amount: `${currency}${total}` },
      ];
    } else {
      this.summaryItems = [{ label: 'Base rate', amount: `${currency}${priceValue}` }];
    }
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

  private resetBookingErrors(): void {
    this.bookingErrors = {
      checkIn: '',
      checkOut: '',
      guests: '',
    };
  }

  private hasBookingErrors(): boolean {
    return Boolean(
      this.bookingErrors.checkIn || this.bookingErrors.checkOut || this.bookingErrors.guests,
    );
  }

  private normalizeDateForApi(value: string): string | null {
    const trimmed = (value || '').trim();
    if (!trimmed) {
      return null;
    }

    const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
    if (isoPattern.test(trimmed)) {
      return trimmed;
    }

    const slashPattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const slashMatch = slashPattern.exec(trimmed);
    if (slashMatch) {
      const [, day, month, year] = slashMatch;
      return `${year}-${month}-${day}`;
    }

    return null;
  }

  private restorePendingBooking(propertyId: string): void {
    const pendingBooking = this.pendingBookingService.consumePendingBookingForProperty(propertyId);
    if (!pendingBooking) {
      return;
    }

    this.paymentSummary = {
      ...this.paymentSummary,
      checkInValue: pendingBooking.checkInValue,
      checkOutValue: pendingBooking.checkOutValue,
      guestsValue: pendingBooking.guestsValue,
    };
  }

  private showAlert(title: string, message: string, variant: ThPopupVariant = 'info'): void {
    this.alertTitle = title;
    this.alertMessage = message;
    this.alertVariant = variant;
    this.isAlertOpen = true;
  }

  onAlertDismissed(): void {
    this.isAlertOpen = false;
    if (this.bookingSuccess) {
      this.bookingSuccess = false;
      this.clearLoadedPropertyDetails();
      this.router.navigate(['/booking-list']);
    }
  }

  private clearLoadedPropertyDetails(): void {
    this.currentPropertyDetail = null;
    this.descriptionParagraphs = [];
    this.amenities = [];
    this.reviewCategoryScores = [];
    this.guestReviews = [];
    this.summaryItems = [];
    this.nightlyPrice = 0;
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
}
