import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

export interface IncomingReportRecord {
  id: string;
  booking_id: string;
  payment_reference: string | null;
  payment_date: string | null;
  gross_value: number;
  taxes: number;
  commission: number;
  net_income: number;
  status: string | null;
}

export interface IncomingReportResponse {
  records: IncomingReportRecord[];
  total_records: number;
  total_gross: number;
  total_net: number;
}

export interface RevenueOverviewItem {
  month: number;
  year: number;
  label: string;
  total_revenue: number;
}

export interface RevenueOverviewResponse {
  data: RevenueOverviewItem[];
}

export interface DashboardMetricsResponse {
  total_reservations: number;
  monthly_revenue: number;
  avg_daily_revenue: number;
  revenue_trend_pct: number;
  today_checkins: number;
  today_checkouts: number;
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly basePath = 'incomings-report/api/reports';

  constructor(private http: HttpClient, private config: ConfigService) {}

  private get baseUrl(): string {
    return (this.config.apiBaseUrl || '').replace(/\/$/, '');
  }

  private buildHeaders(token: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getIncomingReport(token: string, startDate?: string, endDate?: string): Observable<IncomingReportResponse> {
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const url = `${this.baseUrl}/${this.basePath}/incoming${qs}`;
    return this.http.get<IncomingReportResponse>(url, { headers: this.buildHeaders(token) });
  }

  getRevenueOverview(token: string, months = 6): Observable<RevenueOverviewResponse> {
    const url = `${this.baseUrl}/${this.basePath}/revenue-overview?months=${months}`;
    return this.http.get<RevenueOverviewResponse>(url, { headers: this.buildHeaders(token) });
  }

  getDashboardMetrics(token: string): Observable<DashboardMetricsResponse> {
    const url = `${this.baseUrl}/${this.basePath}/dashboard-metrics`;
    return this.http.get<DashboardMetricsResponse>(url, { headers: this.buildHeaders(token) });
  }

  downloadCsv(token: string): Observable<Blob> {
    const url = `${this.baseUrl}/${this.basePath}/incoming/csv`;
    return this.http.get(url, { headers: this.buildHeaders(token), responseType: 'blob' });
  }
}
