import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { PricingOrchestratorResponse, PropertyPriceQuery } from '../models/pricing.model';

@Injectable({ providedIn: 'root' })
export class PricingService {
  constructor(private http: HttpClient, private config: ConfigService) {}

  /**
   * Fetch property details enriched with the computed total stay price from PricingOrchestrator.
   *
   * Calls `GET /pricing-orchestator/api/Property` with the given query parameters.
   * The returned `price` is the total for the full date range (not per-night).
   *
   * @param params - Query parameters: propertyId, guests, dateInit (ISO 8601), dateFinish (ISO 8601), and optional discountCode.
   * @returns Observable of PricingOrchestratorResponse containing property metadata and the computed total price.
   */
  getPropertyWithPrice(params: PropertyPriceQuery): Observable<PricingOrchestratorResponse> {
    const baseUrl = this.config.apiBaseUrl?.replace(/\/$/, '');
    const pricingPath = this.config.pricingOrchestratorApiPath?.replace(/^\//, '') || 'pricing-orchestator/api/Property';
    const url = baseUrl ? `${baseUrl}/${pricingPath}` : `/${pricingPath}`;

    let queryParams = new HttpParams()
      .set('propertyId', params.propertyId)
      .set('guests', String(params.guests))
      .set('dateInit', params.dateInit)
      .set('dateFinish', params.dateFinish);

    if (params.discountCode) {
      queryParams = queryParams.set('discountCode', params.discountCode);
    }

    return this.http.get<PricingOrchestratorResponse>(url, { params: queryParams });
  }
}
