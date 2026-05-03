import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Capacitor } from '@capacitor/core';
import { AppCacheService } from './app-cache.service';
import { ConfigService } from './config.service';
import { ConnectivityService } from './connectivity.service';
import { ImageCacheService } from './image-cache.service';
import { PropertyAmenity, PropertyDetail, PropertyReview } from '../models/property-detail.model';

interface PropertyDetailApiResponse {
  id?: string;
  name?: string;
  city?: string;
  country?: string;
  maxCapacity?: number;
  description?: string;
  photos?: string[];
  checkInTime?: string;
  checkOutTime?: string;
  adminGroupId?: string;
  amenities?: PropertyAmenity[];
  reviews?: PropertyReview[];
}

@Injectable({ providedIn: 'root' })
export class PropertyDetailService {
  constructor(
    private http: HttpClient,
    private config: ConfigService,
    private cache: AppCacheService,
    private connectivityService: ConnectivityService,
    private imageCache: ImageCacheService,
  ) {}

  getPropertyDetail(propertyId: string, accessToken?: string): Observable<PropertyDetail> {
    const baseUrl = this.config.apiBaseUrl?.replace(/\/$/, '');
    const propertyPath = this.config.propertyApiPath?.replace(/^\//, '') || 'poc-properties/api/property';
    const url = baseUrl ? `${baseUrl}/${propertyPath}/${propertyId}` : `/${propertyPath}/${propertyId}`;

    const headersConfig: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = accessToken || this.config.propertyApiToken;

    if (token) {
      headersConfig['Authorization'] = `Bearer ${token}`;
    }

    const headers = new HttpHeaders(headersConfig);

    return this.http
      .get<PropertyDetailApiResponse>(url, { headers })
      .pipe(
        map((response) => this.mapPropertyDetail(response, propertyId)),
        tap((detail) => this.cachePropertyDetail(propertyId, detail)),
        catchError((error) => {
          const cachedDetail = this.readCachedPropertyDetail(propertyId);
          if (cachedDetail) {
            return of(cachedDetail);
          }

          return throwError(() => error);
        }),
      );
  }

  private shouldReadFromCache(): boolean {
    return Capacitor.isNativePlatform() && this.connectivityService.isOffline;
  }

  private cachePropertyDetail(propertyId: string, detail: PropertyDetail): void {
    if (!Capacitor.isNativePlatform()) {
      return;
    }


    // Pre-cache property images in background
    if (detail.photos && detail.photos.length > 0) {
      void this.imageCache.cacheImages(detail.photos);
    }
    this.cache.write(this.getCacheKey(propertyId), detail);
  }

  private readCachedPropertyDetail(propertyId: string): PropertyDetail | null {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    return this.cache.read<PropertyDetail>(this.getCacheKey(propertyId));
  }

  private getCacheKey(propertyId: string): string {
    return `th_property_detail:${propertyId.trim()}`;
  }

  private mapPropertyDetail(response: PropertyDetailApiResponse, fallbackId: string): PropertyDetail {
    const amenities = Array.isArray(response.amenities)
      ? response.amenities.map((amenity) => ({
          id: amenity.id || '',
          description: amenity.description || '',
        }))
      : [];

    const reviews = Array.isArray(response.reviews)
      ? response.reviews.map((review) => ({
          id: review.id || '',
          description: review.description || '',
          rating: Number.isFinite(review.rating) ? review.rating : 0,
          name: review.name || '',
        }))
      : [];

    return {
      id: response.id || fallbackId,
      name: response.name || 'Property',
      city: response.city || '',
      country: response.country || '',
      maxCapacity: response.maxCapacity ?? 0,
      description: response.description || '',
      photos: response.photos || [],
      checkInTime: response.checkInTime || '',
      checkOutTime: response.checkOutTime || '',
      adminGroupId: response.adminGroupId || '',
      amenities,
      reviews,
    };
  }
}
