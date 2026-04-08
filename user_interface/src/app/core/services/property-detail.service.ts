import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfigService } from './config.service';
import { PropertyAmenity, PropertyDetail, PropertyReview } from '../models/property-detail.model';

interface PropertyDetailApiResponse {
  id?: string;
  name?: string;
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
  constructor(private http: HttpClient, private config: ConfigService) {}

  getPropertyDetail(propertyId: string): Observable<PropertyDetail> {
    const baseUrl = this.config.apiBaseUrl?.replace(/\/$/, '');
    const propertyPath = this.config.propertyApiPath?.replace(/^\//, '') || 'poc-properties/api/property';
    const url = baseUrl ? `${baseUrl}/${propertyPath}/${propertyId}` : `/${propertyPath}/${propertyId}`;

    const headersConfig: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.propertyApiToken) {
      headersConfig['Authorization'] = `Bearer ${this.config.propertyApiToken}`;
    }

    const headers = new HttpHeaders(headersConfig);

    return this.http
      .get<PropertyDetailApiResponse>(url, { headers })
      .pipe(map((response) => this.mapPropertyDetail(response, propertyId)));
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
