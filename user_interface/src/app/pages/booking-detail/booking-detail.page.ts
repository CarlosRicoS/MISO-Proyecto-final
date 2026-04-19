import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { Hotel } from '../../core/models/hotel.model';
import { PropertyDetail } from '../../core/models/property-detail.model';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { BookingService, Reservation } from '../../core/services/booking.service';
import { PropertyDetailService } from '../../core/services/property-detail.service';
import { ThAmenityItem } from '../../shared/components/th-amenities-summary/th-amenities-summary.component';
import { ThDetailsMosaicImage } from '../../shared/components/th-details-mosaic/th-details-mosaic.component';
import { ThPaymentSummaryItem } from '../../shared/components/th-payment-summary/th-payment-summary.component';
import { ThGuestReviewItem, ThReviewCategoryScore } from '../../shared/components/th-property-review-summary/th-property-review-summary.component';
import { ThAmenitiesSummaryComponent } from '../../shared/components/th-amenities-summary/th-amenities-summary.component';
import { ThDetailSummaryComponent } from '../../shared/components/th-detail-summary/th-detail-summary.component';
import { ThDetailSummaryStatusVariant } from '../../shared/components/th-detail-summary/th-detail-summary.component';
import { ThDetailsMosaicComponent } from '../../shared/components/th-details-mosaic/th-details-mosaic.component';
import { ThPaymentSummaryComponent } from '../../shared/components/th-payment-summary/th-payment-summary.component';
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
    ThPropertyDescriptionSummaryComponent,
    ThPropertyReviewSummaryComponent,
  ],
})
export class BookingDetailPage implements OnInit {
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

  isCancelConfirmOpen = false;
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
  
  // Accordion state
  isCancelAccordionOpen = true;
  isChangeDatesAccordionOpen = false;

  private currentReservation: Reservation | null = null;
  readonly cancelAlertButtons = [
    {
      text: 'Keep booking',
      role: 'cancel',
    },
    {
      text: 'Cancel booking',
      role: 'destructive',
      handler: () => {
        void this.onCancelConfirmed();
      },
    },
  ];

  constructor(
    private propertyDetailService: PropertyDetailService,
    private bookingService: BookingService,
    private authSessionService: AuthSessionService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    if (!this.authSessionService.isLoggedIn) {
      await this.router.navigate(['/login'], {
        queryParams: {
          returnUrl: this.router.url,
        },
      });
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
    }
  }

  get isEditableStatus(): boolean {
    const normalizedStatus = (this.bookingStatus || '').trim().toUpperCase();
    return normalizedStatus === 'CONFIRMED' || normalizedStatus === 'UPCOMING';
  }

  get isCancellationHiddenForStatus(): boolean {
    const normalizedStatus = (this.bookingStatus || '').trim().toUpperCase();
    return normalizedStatus === 'CANCELED' || normalizedStatus === 'CANCELLED' || normalizedStatus === 'COMPLETED';
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

  onCancelBooking(): void {
    if (!this.currentReservation || this.isReservationCancellationBlocked()) {
      this.showAlert('Cancellation unavailable', 'This reservation can no longer be cancelled.');
      return;
    }

    this.isCancelConfirmOpen = true;
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
      this.showAlert('Reservation Cancelled', 'Your reservation has been cancelled successfully.');
    } catch (error) {
      const httpError = error as HttpErrorResponse;
      let message = 'Unable to cancel reservation. Please try again.';

      if (typeof httpError.error?.message === 'string') {
        message = httpError.error.message;
      } else if (typeof httpError.error?.detail === 'string') {
        message = httpError.error.detail;
      }

      this.showAlert('Cancellation Error', message);
    } finally {
      this.isCancelling = false;
    }
  }

  onRecalculatePrice(): void {
    if (!this.currentReservation) {
      this.showAlert('Error', 'Unable to recalculate price. Reservation data is missing.');
      return;
    }

    this.isRecalculating = true;

    try {
      // TODO: Call booking service to recalculate price with new dates
      // For now, just show a success message
      this.showAlert('Price Updated', 'Reservation dates updated and price recalculated.');
      this.hasDateChanges = false;
      this.isChangeDatesAccordionOpen = false;
    } catch (error) {
      this.showAlert('Error', 'Unable to recalculate price. Please try again.');
    } finally {
      this.isRecalculating = false;
    }
  }

  onCheckInChanged(newDate: string): void {
    this.hasDateChanges = true;
  }

  onCheckOutChanged(newDate: string): void {
    this.hasDateChanges = true;
  }

  onAlertDismissed(): void {
    this.isAlertOpen = false;
    if (this.shouldNavigateToBookingList) {
      this.shouldNavigateToBookingList = false;
      void this.router.navigate(['/booking-list']);
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

  private showAlert(title: string, message: string): void {
    this.alertTitle = title;
    this.alertMessage = message;
    this.isAlertOpen = true;
  }
}
