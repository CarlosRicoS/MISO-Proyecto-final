import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ConfigService } from './config.service';
import { DashboardMetricsResponse, ReportsService } from './reports.service';

class ConfigServiceStub {
  apiBaseUrl = 'https://api.example.com';

  get pricingOrchestratorApiPath(): string {
    return '/pricing-orchestator/api/Property';
  }
}

describe('ReportsService', () => {
  let service: ReportsService;
  let httpMock: HttpTestingController;
  let configService: ConfigServiceStub;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ReportsService, { provide: ConfigService, useClass: ConfigServiceStub }],
    });

    service = TestBed.inject(ReportsService);
    httpMock = TestBed.inject(HttpTestingController);
    configService = TestBed.inject(ConfigService) as unknown as ConfigServiceStub;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getIncomingReport', () => {
    it('builds URL without date parameters when not provided', () => {
      // Arrange
      service.getIncomingReport('test-token').subscribe();

      // Act
      const request = httpMock.expectOne('https://api.example.com/incomings-report/api/reports/incoming');

      // Assert
      expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
      request.flush({ records: [], total_records: 0, total_gross: 0, total_net: 0 });
    });

    it('builds URL with only startDate parameter', () => {
      // Arrange
      service.getIncomingReport('test-token', '2026-01-01').subscribe();

      // Act
      const request = httpMock.expectOne((httpRequest) =>
        httpRequest.url.includes('start_date=2026-01-01') && !httpRequest.url.includes('end_date'),
      );

      // Assert
      expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
      request.flush({ records: [], total_records: 0, total_gross: 0, total_net: 0 });
    });

    it('builds URL with only endDate parameter', () => {
      // Arrange
      service.getIncomingReport('test-token', undefined, '2026-01-31').subscribe();

      // Act
      const request = httpMock.expectOne((httpRequest) =>
        httpRequest.url.includes('end_date=2026-01-31') && !httpRequest.url.includes('start_date'),
      );

      // Assert
      expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
      request.flush({ records: [], total_records: 0, total_gross: 0, total_net: 0 });
    });

    it('builds URL with both startDate and endDate parameters', () => {
      // Arrange
      service.getIncomingReport('test-token', '2026-01-01', '2026-01-31').subscribe();

      // Act
      const request = httpMock.expectOne((httpRequest) =>
        httpRequest.url.includes('start_date=2026-01-01') && httpRequest.url.includes('end_date=2026-01-31'),
      );

      // Assert
      expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
      request.flush({ records: [], total_records: 0, total_gross: 0, total_net: 0 });
    });
  });

  describe('getRevenueOverview', () => {
    it('converts revenue-overview totals to numbers with default months', () => {
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

    it('accepts custom months parameter', () => {
      // Arrange
      service.getRevenueOverview('test-token', 12).subscribe();

      // Act
      const request = httpMock.expectOne((httpRequest) =>
        httpRequest.url === 'https://api.example.com/incomings-report/api/reports/revenue-overview?months=12',
      );

      // Assert
      request.flush({ data: [] });
    });

    it('handles empty data array from API', () => {
      // Arrange
      let responseData: number | undefined;

      // Act
      service.getRevenueOverview('test-token').subscribe((response) => {
        responseData = response.data.length;
      });

      const request = httpMock.expectOne((httpRequest) =>
        httpRequest.url.includes('revenue-overview'),
      );
      request.flush({ data: undefined });

      // Assert
      expect(responseData).toBe(0);
    });

    it('handles null data from API', () => {
      // Arrange
      let responseData: number | undefined;

      // Act
      service.getRevenueOverview('test-token').subscribe((response) => {
        responseData = response.data.length;
      });

      const request = httpMock.expectOne((httpRequest) =>
        httpRequest.url.includes('revenue-overview'),
      );
      request.flush({ data: null });

      // Assert
      expect(responseData).toBe(0);
    });
  });

  describe('getDashboardMetrics', () => {
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

    it('handles numeric values in dashboard metrics response', () => {
      // Arrange
      let responseData: DashboardMetricsResponse | null = null;

      // Act
      service.getDashboardMetrics('test-token').subscribe((response) => {
        responseData = response;
      });

      const request = httpMock.expectOne('https://api.example.com/incomings-report/api/reports/dashboard-metrics');
      request.flush({
        total_reservations: 100,
        monthly_revenue: 50000,
        avg_daily_revenue: 1666.67,
        revenue_trend_pct: 15,
        today_checkins: 10,
        today_checkouts: 8,
      });

      // Assert
      expect(responseData).not.toBeNull();
      const metrics = responseData as unknown as DashboardMetricsResponse;
      expect(metrics.total_reservations).toBe(100);
      expect(metrics.monthly_revenue).toBe(50000);
      expect(metrics.avg_daily_revenue).toBe(1666.67);
    });

    it('handles metrics with comma-separated values', () => {
      // Arrange
      let responseData: DashboardMetricsResponse | null = null;

      // Act
      service.getDashboardMetrics('test-token').subscribe((response) => {
        responseData = response;
      });

      const request = httpMock.expectOne('https://api.example.com/incomings-report/api/reports/dashboard-metrics');
      request.flush({
        total_reservations: '1,000',
        monthly_revenue: '89,240.50',
        avg_daily_revenue: '2,975.35',
        revenue_trend_pct: '43.0',
        today_checkins: '28',
        today_checkouts: '22',
      });

      // Assert
      expect(responseData).not.toBeNull();
      const metrics = responseData as unknown as DashboardMetricsResponse;
      expect(metrics.total_reservations).toBe(1000);
      expect(metrics.monthly_revenue).toBe(89240.5);
      expect(metrics.avg_daily_revenue).toBe(2975.35);
    });

    it('handles null values in metrics and returns 0', () => {
      // Arrange
      let responseData: DashboardMetricsResponse | null = null;

      // Act
      service.getDashboardMetrics('test-token').subscribe((response) => {
        responseData = response;
      });

      const request = httpMock.expectOne('https://api.example.com/incomings-report/api/reports/dashboard-metrics');
      request.flush({
        total_reservations: null,
        monthly_revenue: undefined,
        avg_daily_revenue: 'invalid',
        revenue_trend_pct: NaN,
        today_checkins: 28,
        today_checkouts: 22,
      });

      // Assert
      expect(responseData).not.toBeNull();
      const metrics = responseData as unknown as DashboardMetricsResponse;
      expect(metrics.total_reservations).toBe(0);
      expect(metrics.monthly_revenue).toBe(0);
      expect(metrics.avg_daily_revenue).toBe(0);
      expect(metrics.revenue_trend_pct).toBe(0);
    });
  });

  describe('downloadCsv', () => {
    it('downloads CSV file with authorization header', () => {
      // Arrange
      let csvData: Blob | null = null;

      // Act
      service.downloadCsv('test-token').subscribe((response) => {
        csvData = response;
      });

      const request = httpMock.expectOne('https://api.example.com/incomings-report/api/reports/incoming/csv');

      // Assert
      expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
      expect(request.request.responseType).toBe('blob');
      
      const mockBlob = new Blob(['mock csv data'], { type: 'text/csv' });
      request.flush(mockBlob);
      expect(csvData).not.toBeNull();
      expect(csvData).toEqual(jasmine.any(Blob));
    });
  });

  describe('baseUrl handling', () => {
    it('handles baseUrl with trailing slash', () => {
      // Arrange
      configService.apiBaseUrl = 'https://api.example.com/';
      let responseData: number[] = [];

      // Act
      service.getRevenueOverview('test-token').subscribe((response) => {
        responseData = response.data.map((item) => item.total_revenue);
      });

      // The baseUrl should be normalized (trailing slash removed)
      const request = httpMock.expectOne((httpRequest) =>
        httpRequest.url === 'https://api.example.com/incomings-report/api/reports/revenue-overview?months=6',
      );

      // Assert
      request.flush({
        data: [
          { month: 1, year: 2026, label: 'Jan', total_revenue: '5000.00' },
        ],
      });
      expect(responseData).toEqual([5000]);
    });
  });
});