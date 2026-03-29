import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  id_token: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient, private config: ConfigService) {}

  login(email: string, password: string): Observable<LoginResponse> {
    const baseUrl = this.config.apiBaseUrl?.replace(/\/$/, '');
    const authPath = 'auth/api/auth/login';
    const url = baseUrl ? `${baseUrl}/${authPath}` : `/${authPath}`;

    const body: LoginRequest = {
      email,
      password,
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return this.http.post<LoginResponse>(url, body, { headers });
  }
}
