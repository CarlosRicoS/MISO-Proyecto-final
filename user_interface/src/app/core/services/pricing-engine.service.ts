import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, firstValueFrom, map, catchError } from 'rxjs';
import { ConfigService } from './config.service';
import { PricingData, PricingFilters, RoomType, SeasonalRule } from '../models/pricing.model';
import { HealthResponse, PropertyPriceQuery, PricingPropertyResponse } from '../models/platform-api.model';

export interface PricingApiResponse {
  roomTypes: RoomType[];
  seasonalRules: SeasonalRule[];
}

@Injectable({
  providedIn: 'root',
})
export class PricingEngineService {
  private readonly baseUrl = this.config.apiBaseUrl?.replace(/\/$/, '');
  private readonly propertyPath = this.config.propertyApiPath?.replace(/^\//, '') || 'poc-properties/api/property';

  constructor(private http: HttpClient, private config: ConfigService) {}

  getPricingData(filters: PricingFilters = {}): Observable<PricingData> {
    const url = this.baseUrl ? `${this.baseUrl}/${this.propertyPath}` : `${this.propertyPath}`;

    let params = new HttpParams();

    if (filters.roomType) {
      params = params.set('roomType', filters.roomType);
    }

    if (filters.currency) {
      params = params.set('currency', filters.currency);
    }

    if (filters.season) {
      params = params.set('season', filters.season);
    }

    const headersConfig: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.propertyApiToken) {
      headersConfig['Authorization'] = `Bearer ${this.config.propertyApiToken}`;
    }

    const headers = new HttpHeaders(headersConfig);

    return this.http.get<PricingApiResponse>(url, { params, headers }).pipe(
      map((response): PricingData => ({
        roomTypes: response.roomTypes,
        seasonalRules: response.seasonalRules,
        isLoading: false,
      })),
    );
  }

  getRoomTypes(filters: PricingFilters = {}): Observable<RoomType[]> {
    return this.getPricingData(filters).pipe(
      map((data: PricingData) => data.roomTypes),
    );
  }

  getSeasonalRules(filters: PricingFilters = {}): Observable<SeasonalRule[]> {
    return this.getPricingData(filters).pipe(
      map((data: PricingData) => data.seasonalRules),
    );
  }

  getPricingDataAsync(filters: PricingFilters = {}): Promise<PricingData> {
    return firstValueFrom(this.getPricingData(filters));
  }

  getPricingEngineHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(this.buildUrl('pricing-engine/api/Health'), {
      headers: this.defaultHeaders,
    });
  }

  getPricingEnginePropertyPrice(params: PropertyPriceQuery): Observable<PricingPropertyResponse> {
    return this.http.get<PricingPropertyResponse>(this.buildUrl('pricing-engine/api/PropertyPrice'), {
      headers: this.defaultHeaders,
      params: this.buildPropertyPriceParams(params),
    });
  }

  getPricingOrchestratorHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(this.buildUrl('pricing-orchestator/api/Health'), {
      headers: this.defaultHeaders,
    });
  }

  getPricingOrchestratorProperty(params: PropertyPriceQuery): Observable<PricingPropertyResponse> {
    return this.http.get<PricingPropertyResponse>(this.buildUrl('pricing-orchestator/api/Property'), {
      headers: this.defaultHeaders,
      params: this.buildPropertyPriceParams(params),
    });
  }

  getPropertyPricing(params: PropertyPriceQuery): Observable<PricingPropertyResponse> {
    // Try pricing-engine first, fall back to orchestrator if pricing-engine fails.
    return this.getPricingEnginePropertyPrice(params).pipe(
      catchError(() => this.getPricingOrchestratorProperty(params)),
    );
  }

  private get defaultHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
    });
  }

  private buildUrl(path: string): string {
    const normalizedPath = path.replace(/^\//, '');
    return this.baseUrl ? `${this.baseUrl}/${normalizedPath}` : `/${normalizedPath}`;
  }

  private buildPropertyPriceParams(params: PropertyPriceQuery): HttpParams {
    let queryParams = new HttpParams()
      .set('propertyId', params.propertyId)
      .set('guests', String(params.guests))
      .set('dateInit', params.dateInit)
      .set('dateFinish', params.dateFinish);

    if (params.discountCode) {
      queryParams = queryParams.set('discountCode', params.discountCode);
    }

    return queryParams;
  }

  private normalizeCurrency(currency: string): string {
    return currency?.trim() || '$';
  }

  private formatRate(rate: number, currency: string): string {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(rate);
    return `${currency}${formatted}`;
  }

  private formatDiscount(discount: number): string {
    if (!discount) {
      return 'No discount';
    }
    const sign = discount > 0 ? '+' : '';
    const percentage = Math.abs(discount).toFixed(2);
    return `${sign}${percentage}% OFF`;
  }

  private formatDateRange(dateRange: string): string {
    if (!dateRange) {
      return '-';
    }
    try {
      const start = new Date(dateRange.split(' - ')[0]);
      const end = new Date(dateRange.split(' - ')[1]);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const startMonth = months[start.getMonth()];
      const endMonth = months[end.getMonth()];
      return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`;
    } catch {
      return dateRange || '-';
    }
  }
}
