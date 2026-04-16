export interface PropertyAmenity {
  id: string;
  description: string;
}

export interface PropertyReview {
  id: string;
  description: string;
  rating: number;
  name: string;
}

export interface PropertyDetail {
  id: string;
  name: string;
  city: string;
  country: string;
  maxCapacity: number;
  description: string;
  photos: string[];
  checkInTime: string;
  checkOutTime: string;
  adminGroupId: string;
  amenities: PropertyAmenity[];
  reviews: PropertyReview[];
}
