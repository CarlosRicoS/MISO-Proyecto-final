import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import {
  HealthResponse,
  PmsLockPropertyRequest,
  PmsLockPropertyResponse,
  PricingPropertyResponse,
  PropertyPriceQuery,
} from '../models/platform-api.model';

@Injectable({ providedIn: 'root' })
export class PlatformApiService {
  constructor(private http: HttpClient, private config: ConfigService) {}

  getAuthHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(this.buildUrl('auth/api/health'), { headers: this.defaultHeaders });
  }

  getBookingHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(this.buildUrl('booking/api/health'), { headers: this.defaultHeaders });
  }

  getBookingOrchestratorHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(this.buildUrl('booking-orchestrator/api/health'), { headers: this.defaultHeaders });
  }

  getNotificationsHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(this.buildUrl('notifications/api/health'), { headers: this.defaultHeaders });
  }

  getPmsHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(this.buildUrl('pms/api/health'), { headers: this.defaultHeaders });
  }

  lockPropertyViaPms(payload: PmsLockPropertyRequest): Observable<PmsLockPropertyResponse> {
    return this.http.post<PmsLockPropertyResponse>(this.buildUrl('pms/api/pms/lock-property'), payload, {
      headers: this.defaultHeaders,
    });
  }

  getPricingEngineHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(this.buildUrl('pricing-engine/api/Health'), { headers: this.defaultHeaders });
  }

  getPricingOrchestratorHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(this.buildUrl('pricing-orchestator/api/Health'), { headers: this.defaultHeaders });
  }

  getPricingEnginePropertyPrice(params: PropertyPriceQuery): Observable<PricingPropertyResponse> {
    return this.http.get<PricingPropertyResponse>(this.buildUrl('pricing-engine/api/PropertyPrice'), {
      headers: this.defaultHeaders,
      params: this.buildPropertyPriceParams(params),
    });
  }

  getPricingOrchestratorProperty(params: PropertyPriceQuery): Observable<PricingPropertyResponse> {
    return this.http.get<PricingPropertyResponse>(this.buildUrl('pricing-orchestator/api/Property'), {
      headers: this.defaultHeaders,
      params: this.buildPropertyPriceParams(params),
    });
  }

  private get defaultHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
    });
  }

  private buildUrl(path: string): string {
    const baseUrl = this.config.apiBaseUrl?.replace(/\/$/, '');
    const normalizedPath = path.replace(/^\//, '');
    return baseUrl ? `${baseUrl}/${normalizedPath}` : `/${normalizedPath}`;
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
}
