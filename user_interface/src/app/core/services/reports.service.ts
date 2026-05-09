import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
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

interface DashboardMetricsApiResponse {
  total_reservations: number | string;
  monthly_revenue: number | string;
  avg_daily_revenue: number | string;
  revenue_trend_pct: number | string;
  today_checkins: number | string;
  today_checkouts: number | string;
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
    return this.http.get<RevenueOverviewResponse>(url, { headers: this.buildHeaders(token) }).pipe(
      map((response) => ({
        data: (response.data || []).map((item) => ({
          ...item,
          total_revenue: this.toNumericRevenue(item.total_revenue),
        })),
      })),
    );
  }

  getDashboardMetrics(token: string): Observable<DashboardMetricsResponse> {
    const url = `${this.baseUrl}/${this.basePath}/dashboard-metrics`;
    return this.http.get<DashboardMetricsApiResponse>(url, { headers: this.buildHeaders(token) }).pipe(
      map((response) => ({
        total_reservations: this.toNumericMetric(response.total_reservations),
        monthly_revenue: this.toNumericMetric(response.monthly_revenue),
        avg_daily_revenue: this.toNumericMetric(response.avg_daily_revenue),
        revenue_trend_pct: this.toNumericMetric(response.revenue_trend_pct),
        today_checkins: this.toNumericMetric(response.today_checkins),
        today_checkouts: this.toNumericMetric(response.today_checkouts),
      })),
    );
  }

  downloadCsv(token: string): Observable<Blob> {
    const url = `${this.baseUrl}/${this.basePath}/incoming/csv`;
    return this.http.get(url, { headers: this.buildHeaders(token), responseType: 'blob' });
  }

  private toNumericRevenue(value: number | string | null | undefined): number {
    const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toNumericMetric(value: number | string | null | undefined): number {
    const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '').replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
