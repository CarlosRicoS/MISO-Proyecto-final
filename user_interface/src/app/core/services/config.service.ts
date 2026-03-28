import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface AppConfig {
  apiBaseUrl: string;
  propertyApiPath?: string;
  propertyApiToken?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private config: AppConfig = {
    apiBaseUrl: '',
    propertyApiPath: '/poc-properties/api/property',
    propertyApiToken: '',
  };

  constructor(private http: HttpClient) {}

  async load(): Promise<void> {
    this.config = await firstValueFrom(
      this.http.get<AppConfig>('/assets/config.json')
    );
  }

  get apiBaseUrl(): string {
    return this.config.apiBaseUrl;
  }

  get propertyApiPath(): string {
    return this.config.propertyApiPath || '/poc-properties/api/property';
  }

  get propertyApiToken(): string {
    return this.config.propertyApiToken || '';
  }
}
