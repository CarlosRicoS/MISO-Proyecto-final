export interface RoomType {
  id: string;
  name: string;
  roomTypeId: string;
  capacity: number;
  baseRate: number;
  currency: string;
  discount?: number;
  finalRate: number;
  status: 'Active' | 'Inactive';
  actions?: {
    edit: () => void;
    delete: () => void;
  };
}

export interface SeasonalRule {
  id: string;
  season: string;
  dateRange: string;
  modifier: number;
  status: 'Active' | 'Inactive';
  actions?: {
    edit: () => void;
    delete: () => void;
  };
}

export interface PricingData {
  roomTypes: RoomType[];
  seasonalRules: SeasonalRule[];
  isLoading: boolean;
  errorMessage?: string;
}

export interface PricingFilters {
  roomType?: string;
  currency?: string;
  season?: string;
}

export interface PricingTableData {
  roomType: string;
  capacity: string;
  baseRate: string;
  discount: string;
  finalRate: string;
  status: string;
  actions: string[];
}

export interface SeasonalTableData {
  season: string;
  dateRange: string;
  modifier: string;
  status: string;
  actions: string[];
}

// Query parameters sent to the Pricing Orchestrator API
// export interface PropertyPriceQuery {
//   propertyId: string;
//   guests: number;
//   dateInit: string; // ISO 8601
//   dateFinish: string; // ISO 8601
//   discountCode?: string;
// }

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

// Minimal shape for the Pricing Orchestrator response used by the UI
// export interface PricingOrchestratorResponse {
//   propertyId: string;
//   currency: string;
//   totalPrice: number; // total price for the requested date range
//   // Backwards-compatible alias for older code that expects `price`
//   price?: number;
//   perNight?: Array<{ date: string; price: number }>;
//   breakdown?: Record<string, unknown>;
// }
