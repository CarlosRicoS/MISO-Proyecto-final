export interface PricingOrchestratorResponse {
  id: string;
  name: string;
  maxCapacity: number;
  description: string;
  urlBucketPhotos: string;
  checkInTime: string;
  checkOutTime: string;
  adminGroupId: string;
  price: number;
}

export { PropertyPriceQuery } from './platform-api.model';
