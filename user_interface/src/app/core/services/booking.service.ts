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
  id?: string;
  property_id?: string;
  user_id?: string;
  guests?: number;
  period_start?: string;
  period_end?: string;
  price?: number;
  status?: string;
  admin_group_id?: string;
  payment_reference?: string | null;
  created_at?: string;
  reservation_id?: string;
  message?: string;
}

export interface Reservation {
  id: string;
  property_id: string;
  user_id: string;
  guests: number;
  period_start: string;
  period_end: string;
  price: number;
  status: string;
  admin_group_id: string;
  payment_reference: string | null;
  created_at: string;
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

  listReservations(accessToken?: string): Observable<Reservation[]> {
    const baseUrl = this.config.apiBaseUrl?.replace(/\/$/, '');
    const bookingListPath = this.config.bookingListApiPath?.replace(/^\//, '') || 'booking/api/booking';
    const url = baseUrl ? `${baseUrl}/${bookingListPath}` : `/${bookingListPath}`;

    const headersConfig: Record<string, string> = {};

    if (accessToken) {
      headersConfig['Authorization'] = `Bearer ${accessToken}`;
    }

    const headers = new HttpHeaders(headersConfig);

    return this.http.get<Reservation[]>(url, { headers });
  }
}
