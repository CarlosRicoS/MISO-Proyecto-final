import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfigService } from './config.service';
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
  imageUrl?: string;
  urlBucketPhotos?: string;
}

interface PropertySearchParams {
  startDate?: string;
  endDate?: string;
  city?: string;
  capacity?: number;
}

@Injectable({ providedIn: 'root' })
export class HotelsService {
  constructor(private http: HttpClient, private config: ConfigService) {}

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

  private mapPropertyToHotel(property: PropertyApiResponse, fallbackCity?: string): Hotel {
    return {
      id: property.id,
      name: property.name || 'Hotel',
      city: property.city || fallbackCity || '',
      country: property.country || '',
      pricePerNight: property.pricePerNight ?? property.price ?? 0,
      currency: property.currency || '$',
      rating: Number.isFinite(property.rating) ? Number(property.rating) : 0,
      imageUrl: property.imageUrl || property.urlBucketPhotos || '',
    };
  }
}
