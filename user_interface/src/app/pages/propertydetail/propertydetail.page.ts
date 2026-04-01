import { Component } from '@angular/core';
import { ThAmenityItem } from '../../shared/components/th-amenities-summary/th-amenities-summary.component';
import { ThDetailsMosaicImage } from '../../shared/components/th-details-mosaic/th-details-mosaic.component';
import { ThPaymentSummaryBadge, ThPaymentSummaryItem } from '../../shared/components/th-payment-summary/th-payment-summary.component';
import { ThGuestReviewItem, ThReviewCategoryScore } from '../../shared/components/th-property-review-summary/th-property-review-summary.component';

@Component({
  selector: 'app-propertydetail',
  templateUrl: './propertydetail.page.html',
  styleUrls: ['./propertydetail.page.scss'],
  standalone: false,
})
export class PropertydetailPage {
  readonly property = {
    title: 'Grand Luxury Resort & Spa',
    location: 'Bali, Indonesia',
    price: '$180',
    rating: '4.8',
    score: '4.8',
    scoreLabel: 'Exceptional',
    reviewsText: '2,847 reviews',
    stars: 5,
    imageUrl: '',
    totalPhotos: 24,
    images: [
      {
        src: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1800&q=80',
        alt: 'Hotel exterior at sunset with pool',
      },
      {
        src: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80',
        alt: 'Deluxe room with city view',
      },
      {
        src: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
        alt: 'Restaurant table setup with chandelier',
      },
      {
        src: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
        alt: 'Spa area with soft ambient lighting',
      },
      {
        src: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80',
        alt: 'Lounge with premium seating',
      },
      {
        src: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1200&q=80',
        alt: 'Suite interior with warm lighting',
      },
    ] as ThDetailsMosaicImage[],
  };

  readonly summaryItems: ThPaymentSummaryItem[] = [
    { label: '$299 × 3 nights', amount: '$897' },
    { label: 'Service fee', amount: '$45', muted: true },
    { label: 'Taxes', amount: '$67', muted: true },
  ];

  readonly summaryBadges: ThPaymentSummaryBadge[] = [
    { text: 'Free cancellation', variant: 'success', icon: 'checkmark-circle' },
    { text: 'Best price', variant: 'info', icon: 'sparkles-outline' },
  ];

  readonly descriptionParagraphs: string[] = [
    "Experience luxury at Grand Luxury Resort & Spa, nestled in the heart of Bali's tropical paradise. Our 5-star resort offers breathtaking ocean views, world-class amenities, and exceptional service.",
    'Each room features modern design, premium bedding, private balconies, and state-of-the-art technology. Indulge in our award-winning spa, dine at our gourmet restaurants, or relax by the infinity pool overlooking the ocean.',
    'Located near the island\'s iconic temples and vibrant cultural districts, the resort gives you effortless access to Bali\'s most memorable experiences. Our concierge team is available 24/7 to curate your perfect stay.',
  ];

  readonly amenities: ThAmenityItem[] = [
    { label: 'Free WiFi', icon: 'wifi-outline' },
    { label: 'Free Parking', icon: 'car-outline' },
    { label: 'Pool', icon: 'water-outline' },
    { label: 'Fitness Center', icon: 'barbell-outline' },
    { label: 'Restaurant', icon: 'restaurant-outline' },
    { label: 'Spa', icon: 'flower-outline' },
    { label: '24/7 Concierge', icon: 'person-outline' },
    { label: 'Air Conditioning', icon: 'snow-outline' },
    { label: 'Room Service', icon: 'cafe-outline' },
  ];

  readonly reviewCategoryScores: ThReviewCategoryScore[] = [
    { value: '9.4', label: 'Cleanliness' },
    { value: '9.1', label: 'Service' },
    { value: '9.3', label: 'Location' },
    { value: '9.0', label: 'Value' },
  ];

  readonly guestReviews: ThGuestReviewItem[] = [
    {
      name: 'Sarah Johnson',
      locationAndDate: 'New York, USA • December 2024',
      relativeDate: '2 days ago',
      text: "Amazing experience! The staff was incredibly friendly and the room was spotless. The infinity pool has the best views I've ever seen. Highly recommend!",
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80',
      score: '5.0',
      stars: 5,
    },
    {
      name: 'Michael Chen',
      locationAndDate: 'San Francisco, USA • November 2024',
      relativeDate: '1 week ago',
      text: 'Perfect location and luxurious facilities. The spa treatments were exceptional. Only minor issue was the breakfast could have more variety.',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80',
      score: '4.8',
      stars: 4,
    },
    {
      name: 'Emma Williams',
      locationAndDate: 'London, UK • November 2024',
      relativeDate: '2 weeks ago',
      text: "Perfect location for exploring nearby attractions. The concierge team helped us plan our entire itinerary and every recommendation was excellent.",
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=160&q=80',
      score: '4.9',
      stars: 5,
    },
  ];
}
