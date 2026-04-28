export interface HealthResponse {
  status: string;
  service?: string;
}

export interface PmsLockPropertyRequest {
  property_id: string;
  start_date: string;
  end_date: string;
  user_id?: string;
}

export interface PmsLockPropertyResponse {
  status: string;
  message?: string;
}

export interface PropertyPriceQuery {
  propertyId: string;
  guests: number;
  dateInit: string;
  dateFinish: string;
  discountCode?: string;
}

export interface PricingPropertyResponse {
  id?: string;
  name?: string;
  city?: string;
  country?: string;
  price?: number;
  maxCapacity?: number;
  description?: string;
  urlBucketPhotos?: string;
  checkInTime?: string;
  checkOutTime?: string;
  adminGroupId?: string;
}
