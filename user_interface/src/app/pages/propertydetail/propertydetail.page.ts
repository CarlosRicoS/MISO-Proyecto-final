import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ThAmenityItem } from '../../shared/components/th-amenities-summary/th-amenities-summary.component';
import { ThDetailsMosaicImage } from '../../shared/components/th-details-mosaic/th-details-mosaic.component';
import { ThPaymentSummaryBadge, ThPaymentSummaryItem } from '../../shared/components/th-payment-summary/th-payment-summary.component';
import { ThGuestReviewItem, ThReviewCategoryScore } from '../../shared/components/th-property-review-summary/th-property-review-summary.component';
import { PropertyDetailService } from '../../core/services/property-detail.service';
import { PropertyDetail } from '../../core/models/property-detail.model';
import { Hotel } from '../../core/models/hotel.model';

@Component({
  selector: 'app-propertydetail',
  templateUrl: './propertydetail.page.html',
  styleUrls: ['./propertydetail.page.scss'],
  standalone: false,
})
export class PropertydetailPage implements OnInit {
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
  errorMessage = '';

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

  constructor(
    private propertyDetailService: PropertyDetailService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

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
    const locationParts = [hotel?.city, hotel?.country].filter((part) => Boolean(part));
    const location = locationParts.length ? locationParts.join(', ') : 'Location unavailable';
    const priceValue = Number.isFinite(hotel?.pricePerNight) ? Number(hotel?.pricePerNight) : 0;
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
  }

  private updatePaymentSummary(
    priceValue: number,
    currency: string,
    search?: { startDate?: string; endDate?: string; capacity?: number },
  ): void {
    const nights = this.getNightsBetween(search?.startDate, search?.endDate);
    const total = nights > 0 ? priceValue * nights : priceValue;
    const guestsLabel = search?.capacity ? `${search.capacity} ${search.capacity === 1 ? 'Guest' : 'Guests'}` : '';

    this.paymentSummary = {
      title: `${currency}${priceValue}`,
      subtitle: 'per night',
      promoText: 'Book with confidence',
      checkInValue: search?.startDate || '',
      checkOutValue: search?.endDate || '',
      guestsValue: guestsLabel,
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
