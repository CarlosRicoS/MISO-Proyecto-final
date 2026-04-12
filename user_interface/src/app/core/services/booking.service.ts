import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

export interface ReservationRequest {
  property_id: string;
  user_id: string;
  user_email: string;
  guests: number;
  period_start: string;
  period_end: string;
  price: number;
  admin_group_id: string;
}

export interface ReservationResponse {
  reservation_id?: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  constructor(private http: HttpClient, private config: ConfigService) {}

  createReservation(
    payload: ReservationRequest,
    accessToken?: string,
  ): Observable<ReservationResponse> {
    const baseUrl = this.config.apiBaseUrl?.replace(/\/$/, '');
    const bookingPath = this.config.bookingApiPath?.replace(/^\//, '') || 'booking-orchestrator/api/reservations';
    const url = baseUrl ? `${baseUrl}/${bookingPath}` : `/${bookingPath}`;

    const headersConfig: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headersConfig['Authorization'] = `Bearer ${accessToken}`;
    }

    const headers = new HttpHeaders(headersConfig);

    return this.http.post<ReservationResponse>(url, payload, { headers });
  }
}
