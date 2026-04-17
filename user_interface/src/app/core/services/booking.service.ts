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

export interface BookingDatesUpdateRequest {
  new_period_start: string;
  new_period_end: string;
  new_price: number;
}

export interface BookingDatesUpdateResponse {
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
  price_difference: number;
}

export interface ReservationAdminActionRequest {
  traveler_email: string;
}

export interface ReservationAdminRejectRequest extends ReservationAdminActionRequest {
  reason: string;
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

  listReservations(accessToken?: string, userId?: string): Observable<Reservation[]> {
    const baseUrl = this.config.apiBaseUrl?.replace(/\/$/, '');
    const configuredPath = this.config.bookingListApiPath?.replace(/^\//, '') || 'booking/api/booking';
    const normalizedPath = configuredPath.replace(/\/$/, '');
    const bookingPathWithPrefix = normalizedPath.startsWith('booking/')
      ? normalizedPath
      : `booking/${normalizedPath}`;
    const bookingListPath = `${bookingPathWithPrefix}/`;
    const url = baseUrl ? `${baseUrl}/${bookingListPath}` : `/${bookingListPath}`;

    const headersConfig: Record<string, string> = {};

    if (accessToken) {
      headersConfig['Authorization'] = `Bearer ${accessToken}`;
    }
    if (userId) {
      headersConfig['X-User-Id'] = userId;
    }

    const headers = new HttpHeaders(headersConfig);

    return this.http.get<Reservation[]>(url, { headers });
  }

  getReservation(bookingId: string, accessToken?: string): Observable<Reservation> {
    const baseUrl = this.config.apiBaseUrl?.replace(/\/$/, '');
    const bookingListPath = this.config.bookingListApiPath?.replace(/^\//, '') || 'booking/api/booking';
    const url = baseUrl
      ? `${baseUrl}/${bookingListPath}/${bookingId}`
      : `/${bookingListPath}/${bookingId}`;

    const headersConfig: Record<string, string> = {};
    if (accessToken) {
      headersConfig['Authorization'] = `Bearer ${accessToken}`;
    }

    const headers = new HttpHeaders(headersConfig);
    return this.http.get<Reservation>(url, { headers });
  }

  cancelReservation(bookingId: string, accessToken?: string): Observable<Reservation> {
    const baseUrl = this.config.apiBaseUrl?.replace(/\/$/, '');
    const bookingListPath = this.config.bookingListApiPath?.replace(/^\//, '') || 'booking/api/booking';
    const url = baseUrl
      ? `${baseUrl}/${bookingListPath}/${bookingId}/cancel`
      : `/${bookingListPath}/${bookingId}/cancel`;

    const headersConfig: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headersConfig['Authorization'] = `Bearer ${accessToken}`;
    }

    const headers = new HttpHeaders(headersConfig);
    return this.http.post<Reservation>(url, {}, { headers });
  }

  updateReservationDates(
    bookingId: string,
    payload: BookingDatesUpdateRequest,
    accessToken?: string,
  ): Observable<BookingDatesUpdateResponse> {
    const baseUrl = this.config.apiBaseUrl?.replace(/\/$/, '');
    const bookingListPath = this.config.bookingListApiPath?.replace(/^\//, '') || 'booking/api/booking';
    const url = baseUrl
      ? `${baseUrl}/${bookingListPath}/${bookingId}/dates`
      : `/${bookingListPath}/${bookingId}/dates`;

    const headersConfig: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headersConfig['Authorization'] = `Bearer ${accessToken}`;
    }

    const headers = new HttpHeaders(headersConfig);
    return this.http.patch<BookingDatesUpdateResponse>(url, payload, { headers });
  }

  adminConfirmBooking(bookingId: string, accessToken?: string): Observable<Reservation> {
    const baseUrl = this.config.apiBaseUrl?.replace(/\/$/, '');
    const bookingListPath = this.config.bookingListApiPath?.replace(/^\//, '') || 'booking/api/booking';
    const url = baseUrl
      ? `${baseUrl}/${bookingListPath}/${bookingId}/admin-confirm`
      : `/${bookingListPath}/${bookingId}/admin-confirm`;

    const headersConfig: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headersConfig['Authorization'] = `Bearer ${accessToken}`;
    }

    const headers = new HttpHeaders(headersConfig);
    return this.http.post<Reservation>(url, {}, { headers });
  }

  adminRejectBooking(bookingId: string, reason: string, accessToken?: string): Observable<Reservation> {
    const baseUrl = this.config.apiBaseUrl?.replace(/\/$/, '');
    const bookingListPath = this.config.bookingListApiPath?.replace(/^\//, '') || 'booking/api/booking';
    const url = baseUrl
      ? `${baseUrl}/${bookingListPath}/${bookingId}/admin-reject`
      : `/${bookingListPath}/${bookingId}/admin-reject`;

    const headersConfig: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headersConfig['Authorization'] = `Bearer ${accessToken}`;
    }

    const headers = new HttpHeaders(headersConfig);
    return this.http.post<Reservation>(url, { reason }, { headers });
  }

  updateOrchestratedReservationDates(
    bookingId: string,
    payload: BookingDatesUpdateRequest,
    accessToken?: string,
  ): Observable<BookingDatesUpdateResponse> {
    const baseUrl = this.config.apiBaseUrl?.replace(/\/$/, '');
    const bookingPath = this.config.bookingApiPath?.replace(/^\//, '') || 'booking-orchestrator/api/reservations';
    const url = baseUrl
      ? `${baseUrl}/${bookingPath}/${bookingId}/dates`
      : `/${bookingPath}/${bookingId}/dates`;

    const headersConfig: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headersConfig['Authorization'] = `Bearer ${accessToken}`;
    }

    const headers = new HttpHeaders(headersConfig);
    return this.http.patch<BookingDatesUpdateResponse>(url, payload, { headers });
  }

  adminConfirmReservation(
    bookingId: string,
    payload: ReservationAdminActionRequest,
    accessToken?: string,
  ): Observable<ReservationResponse> {
    const baseUrl = this.config.apiBaseUrl?.replace(/\/$/, '');
    const bookingPath = this.config.bookingApiPath?.replace(/^\//, '') || 'booking-orchestrator/api/reservations';
    const url = baseUrl
      ? `${baseUrl}/${bookingPath}/${bookingId}/admin-confirm`
      : `/${bookingPath}/${bookingId}/admin-confirm`;

    const headersConfig: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headersConfig['Authorization'] = `Bearer ${accessToken}`;
    }

    const headers = new HttpHeaders(headersConfig);
    return this.http.post<ReservationResponse>(url, payload, { headers });
  }

  adminRejectReservation(
    bookingId: string,
    payload: ReservationAdminRejectRequest,
    accessToken?: string,
  ): Observable<ReservationResponse> {
    const baseUrl = this.config.apiBaseUrl?.replace(/\/$/, '');
    const bookingPath = this.config.bookingApiPath?.replace(/^\//, '') || 'booking-orchestrator/api/reservations';
    const url = baseUrl
      ? `${baseUrl}/${bookingPath}/${bookingId}/admin-reject`
      : `/${bookingPath}/${bookingId}/admin-reject`;

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
