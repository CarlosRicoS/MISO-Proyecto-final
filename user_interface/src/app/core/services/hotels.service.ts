import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { ConfigService } from './config.service';
import { PricingService } from './pricing.service';
import { Hotel } from '../models/hotel.model';

interface PropertyApiResponse {
  id: string;
  name?: string;
  city?: string;
  country?: string;
  price?: number;
  pricePerNight?: number;
  currency?: string;
  rating?: number;
  photos?: string[];
  imageUrl?: string;
  urlBucketPhotos?: string | string[];
}

interface PropertySearchParams {
  startDate?: string;
  endDate?: string;
  city?: string;
  capacity?: number;
  page?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class HotelsService {
  constructor(
    private http: HttpClient,
    private config: ConfigService,
    private pricingService: PricingService,
  ) {}

  getHotels(params: PropertySearchParams = {}): Observable<Hotel[]> {
    const baseUrl = this.config.apiBaseUrl?.replace(/\/$/, '');
    const propertyPath = this.config.propertyApiPath?.replace(/^\//, '') || 'poc-properties/api/property';
    const url = baseUrl ? `${baseUrl}/${propertyPath}` : `/${propertyPath}`;

    let queryParams = new HttpParams();

    if (params.startDate) {
      queryParams = queryParams.set('startDate', params.startDate);
    }

    if (params.endDate) {
      queryParams = queryParams.set('endDate', params.endDate);
    }

    if (params.city) {
      queryParams = queryParams.set('city', params.city);
    }

    if (Number.isFinite(params.capacity) && Number(params.capacity) > 0) {
      queryParams = queryParams.set('capacity', String(params.capacity));
    }

    if (Number.isFinite(params.page) && Number(params.page) >= 0) {
      queryParams = queryParams.set('page', String(params.page));
    }

    if (Number.isFinite(params.size) && Number(params.size) > 0) {
      queryParams = queryParams.set('size', String(params.size));
    }

    const headersConfig: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.propertyApiToken) {
      headersConfig['Authorization'] = `Bearer ${this.config.propertyApiToken}`;
    }

    const headers = new HttpHeaders(headersConfig);

    return this.http
        .get<PropertyApiResponse[]>(url, { headers, params: queryParams })
        .pipe(map((response) => response.map((property) => this.mapPropertyToHotel(property, params.city))));
  }

  /**
   * Fetch hotels from poc-properties and enrich each with a base nightly price from PricingOrchestrator.
   *
   * Calls `getHotels()` first, then fires one `PricingService.getPropertyWithPrice()` call per
   * hotel in parallel via `forkJoin` (1 guest, tomorrow to day-after-tomorrow). If an individual
   * pricing call fails, that hotel falls back to pricePerNight = 0 (non-blocking).
   *
   * @param params - Optional search filters (city, capacity, dates, pagination).
   * @returns Observable of Hotel[] with `pricePerNight` populated from live pricing data.
   */
  getHotelsWithPricing(params: PropertySearchParams = {}): Observable<Hotel[]> {
    return this.getHotels(params).pipe(
      switchMap((hotels) => this.enrichWithPricing(hotels)),
    );
  }

  private enrichWithPricing(hotels: Hotel[]): Observable<Hotel[]> {
    if (!hotels.length) {
      return of([]);
    }

    const tomorrowISO = this.getTomorrowISO();
    const dayAfterTomorrowISO = this.getDayAfterTomorrowISO();

    const pricingCalls = hotels.map((hotel) =>
      this.pricingService.getPropertyWithPrice({
        propertyId: hotel.id,
        guests: 1,
        dateInit: tomorrowISO,
        dateFinish: dayAfterTomorrowISO,
      }).pipe(
        catchError(() => of({ price: 0 } as { price: number })),
      ),
    );

    return forkJoin(pricingCalls).pipe(
      map((pricingResults) =>
        hotels.map((hotel, index) => ({
          ...hotel,
          pricePerNight: pricingResults[index].price ?? hotel.pricePerNight,
        })),
      ),
    );
  }

  private getTomorrowISO(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getDayAfterTomorrowISO(): string {
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    const year = dayAfter.getFullYear();
    const month = String(dayAfter.getMonth() + 1).padStart(2, '0');
    const day = String(dayAfter.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private mapPropertyToHotel(property: PropertyApiResponse, fallbackCity?: string): Hotel {
    const normalizedPhotos = this.normalizePhotos(property);

    return {
      id: property.id,
      name: property.name || 'Hotel',
      city: property.city || fallbackCity || '',
      country: property.country || '',
      pricePerNight: property.pricePerNight ?? property.price ?? 0,
      currency: property.currency || '$',
      rating: Number.isFinite(property.rating) ? Number(property.rating) : 0,
      photos: normalizedPhotos,
    };
  }

  private normalizePhotos(property: PropertyApiResponse): string[] {
    if (Array.isArray(property.photos) && property.photos.length) {
      return property.photos.filter((photo): photo is string => Boolean(photo && photo.trim()));
    }

    if (property.urlBucketPhotos) {
      const bucketPhotos = Array.isArray(property.urlBucketPhotos)
        ? property.urlBucketPhotos
        : [property.urlBucketPhotos];
      return bucketPhotos.filter((photo): photo is string => Boolean(photo && photo.trim()));
    }

    if (property.imageUrl && property.imageUrl.trim()) {
      return [property.imageUrl];
    }

    return [''];
  }
}
