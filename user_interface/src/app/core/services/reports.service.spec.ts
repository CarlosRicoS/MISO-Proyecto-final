import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ConfigService } from './config.service';
import { DashboardMetricsResponse, ReportsService } from './reports.service';

class ConfigServiceStub {
  get apiBaseUrl(): string {
    return 'https://api.example.com';
  }

  get pricingOrchestratorApiPath(): string {
    return '/pricing-orchestator/api/Property';
  }
}

describe('ReportsService', () => {
  let service: ReportsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ReportsService, { provide: ConfigService, useClass: ConfigServiceStub }],
    });

    service = TestBed.inject(ReportsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('converts revenue-overview totals to numbers', () => {
    // Arrange
    let responseData: number[] = [];

    // Act
    service.getRevenueOverview('test-token').subscribe((response) => {
      responseData = response.data.map((item) => item.total_revenue);
    });

    const request = httpMock.expectOne((httpRequest) =>
      httpRequest.url === 'https://api.example.com/incomings-report/api/reports/revenue-overview?months=6',
    );
    request.flush({
      data: [
        { month: 12, year: 2025, label: 'Dec', total_revenue: '7000.00' },
        { month: 1, year: 2026, label: 'Jan', total_revenue: '4310.00' },
      ],
    });

    // Assert
    expect(responseData).toEqual([7000, 4310]);
  });

  it('normalizes dashboard metrics string values to numbers', () => {
    // Arrange
    let responseData: DashboardMetricsResponse | null = null;

    // Act
    service.getDashboardMetrics('test-token').subscribe((response) => {
      responseData = response;
    });

    const request = httpMock.expectOne('https://api.example.com/incomings-report/api/reports/dashboard-metrics');
    const rawDashboardMetrics = JSON.parse(
      '{"total_reservations":"247","monthly_revenue":"89240.50","avg_daily_revenue":"2975.35","revenue_trend_pct":"43.0","today_checkins":"28","today_checkouts":"22"}',
    ) as unknown;
    request.flush(rawDashboardMetrics as never);

    // Assert
    expect(responseData).not.toBeNull();
    const metrics = responseData as unknown as DashboardMetricsResponse;
    expect(metrics.total_reservations).toBe(247);
    expect(metrics.monthly_revenue).toBe(89240.5);
    expect(metrics.avg_daily_revenue).toBe(2975.35);
    expect(metrics.revenue_trend_pct).toBe(43);
    expect(metrics.today_checkins).toBe(28);
    expect(metrics.today_checkouts).toBe(22);
  });
});