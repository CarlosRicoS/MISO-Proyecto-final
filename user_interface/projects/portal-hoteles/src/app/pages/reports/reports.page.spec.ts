import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { PortalHotelesReportsPage } from './reports.page';
import { AuthSessionService } from '@travelhub/core/services/auth-session.service';
import { IncomingReportResponse, ReportsService } from '@travelhub/core/services/reports.service';
import { translateTestingModule } from '../../testing/translate-testing.module';

describe('PortalHotelesReportsPage', () => {
  let component: PortalHotelesReportsPage;
  let fixture: ComponentFixture<PortalHotelesReportsPage>;

  const kpiFixture = [
    {
      label: 'Avg. Daily Revenue',
      value: '$278',
      trend: '+23.0% from previous month',
      trendClass: 'portal-hoteles-reports-kpi__trend--positive',
      icon: 'analytics-outline',
    },
    {
      label: 'Monthly Revenue',
      value: '$8,350',
      trend: '+23.0% from previous month',
      trendClass: 'portal-hoteles-reports-kpi__trend--positive',
      icon: 'cash-outline',
    },
  ];

  const rowFixture = Array.from({ length: 6 }, (_, i) => ({
    dateLabel: `Apr ${i + 1}, 2026`,
    bookingId: `bk00000${i + 1}`,
    paymentRef: `PAY-${i + 1}`,
    grossValue: 1000 + i * 100,
    netIncome: 800 + i * 80,
    status: 'CONFIRMED',
  }));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortalHotelesReportsPage, HttpClientTestingModule, translateTestingModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(PortalHotelesReportsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the reports page scaffold', () => {
    // Arrange

    // Act
    const createdComponent = component;

    // Assert
    expect(createdComponent).toBeTruthy();
  });

  it('renders the reports heading', () => {
    // Arrange

    // Act
    const element = fixture.nativeElement as HTMLElement;

    // Assert
    expect(element.textContent).toContain('Incoming Report');
    expect(element.textContent).toContain("Welcome back! Here's what's happening at your hotel today.");
  });

  it('renders kpi cards and first page rows when data is set', () => {
    // Arrange — set data directly (component loads via ionViewWillEnter in production)
    component.kpiCards = kpiFixture as never;
    component.reportRows = rowFixture.slice(0, 5) as never;

    // Act
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const kpiCards = element.querySelectorAll('.portal-hoteles-reports-kpi');
    const rows = element.querySelectorAll('.portal-hoteles-reports-table__row');

    // Assert
    expect(kpiCards.length).toBe(2);
    expect(rows.length).toBe(5);
    expect(element.textContent).toContain('Avg. Daily Revenue');
    expect(element.textContent).toContain('Monthly Revenue');
    expect(element.textContent).toContain('PDF');
    expect(element.textContent).toContain('Excel');
  });

  it('generates a pdf report from the csv export response', async () => {
    // Arrange
    const authSession = TestBed.inject(AuthSessionService);
    const reportsService = TestBed.inject(ReportsService);
    spyOnProperty(authSession, 'idToken', 'get').and.returnValue('test-token');
    spyOn(reportsService, 'downloadCsv').and.returnValue(
      of(new Blob([
        'payment_date,booking_id,payment_reference,gross_value,status,net_income\n',
        '2026-05-01,booking-1,PAY-1,1000,CONFIRMED,900\n',
        '2026-05-02,booking-2,PAY-2,1200,PAID,1100\n',
      ], { type: 'text/csv;charset=utf-8' })),
    );
    const saveSpy = jasmine.createSpy('save');
    spyOn(component as never, 'buildRevenuePdf').and.returnValue({ save: saveSpy } as never);

    // Act
    await (component as never as { onDownloadPdf: () => Promise<void> }).onDownloadPdf();

    // Assert
    expect(reportsService.downloadCsv).toHaveBeenCalledWith('test-token');
    expect(saveSpy).toHaveBeenCalled();
    expect(saveSpy.calls.mostRecent().args[0]).toMatch(/revenue_report_\d{4}-\d{2}-\d{2}\.pdf/);
  });

  it('parses revenue strings and fits the chart scale to the maximum value', async () => {
    // Arrange
    const authSession = TestBed.inject(AuthSessionService);
    const reportsService = TestBed.inject(ReportsService);
    spyOnProperty(authSession, 'idToken', 'get').and.returnValue('test-token');
    spyOn(reportsService, 'getIncomingReport').and.returnValue(
      of({ records: [], total_records: 0, total_gross: 0, total_net: 0 }),
    );
    spyOn(reportsService, 'getRevenueOverview').and.returnValue(
      of({
        data: [
          { month: 12, year: 2025, label: 'Dec', total_revenue: 7000 },
          { month: 1, year: 2026, label: 'Jan', total_revenue: 4310 },
          { month: 2, year: 2026, label: 'Feb', total_revenue: 5940 },
          { month: 3, year: 2026, label: 'Mar', total_revenue: 6790 },
          { month: 4, year: 2026, label: 'Apr', total_revenue: 6350 },
        ],
      }),
    );
    spyOn(reportsService, 'getDashboardMetrics').and.returnValue(
      of({
        total_reservations: 0,
        monthly_revenue: 0,
        avg_daily_revenue: 0,
        revenue_trend_pct: 0,
        today_checkins: 0,
        today_checkouts: 0,
      }),
    );

    // Act
    await (component as never as { loadReportData: () => Promise<void> }).loadReportData();

    // Assert
    expect(component.chartValues).toEqual([7000, 4310, 5940, 6790, 6350]);
    expect(component.chartTicks).toEqual([7000, 5250, 3500, 1750, 0]);
  });

  it('normalizes gross and net income values returned as strings from the api', async () => {
    // Arrange
    const authSession = TestBed.inject(AuthSessionService);
    const reportsService = TestBed.inject(ReportsService);
    spyOnProperty(authSession, 'idToken', 'get').and.returnValue('test-token');
    const incomingReportResponse: IncomingReportResponse = {
      records: [
        {
          id: '1',
          booking_id: 'booking-1',
          payment_reference: 'PAY-1',
          payment_date: '2026-05-01',
          gross_value: '1250.50' as never,
          taxes: '87.54' as never,
          commission: '62.53' as never,
          net_income: '1100.43' as never,
          status: 'CONFIRMED',
        } as never,
      ],
      total_records: 1,
      total_gross: '1250.50' as never,
      total_net: '1100.43' as never,
    };
    spyOn(reportsService, 'getIncomingReport').and.returnValue(
      of(incomingReportResponse),
    );
    spyOn(reportsService, 'getRevenueOverview').and.returnValue(
      of({ data: [] }),
    );
    spyOn(reportsService, 'getDashboardMetrics').and.returnValue(
      of({
        total_reservations: 0,
        monthly_revenue: 0,
        avg_daily_revenue: 0,
        revenue_trend_pct: 0,
        today_checkins: 0,
        today_checkouts: 0,
      }),
    );

    // Act
    await (component as never as { loadReportData: () => Promise<void> }).loadReportData();

    // Assert
    expect(component.reportRows[0].grossValue).toBe(1250.5);
    expect(component.reportRows[0].netIncome).toBe(1100.43);
    expect(component.formatAmount(component.reportRows[0].grossValue)).toContain('1');
  });

  it('re-renders the grid values when the selected currency changes', () => {
    // Arrange
    component.reportRows = [
      {
        dateLabel: 'May 1, 2026',
        bookingId: 'booking-1',
        paymentRef: 'PAY-1',
        grossValue: 1250.5,
        netIncome: 1100.43,
        status: 'CONFIRMED',
      },
    ] as never;
    component.selectedCurrency = 'USD';

    // Act
    fixture.detectChanges();
    component.onCurrencyChange('EUR');
    fixture.detectChanges();

    // Assert
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('EUR');
  });

  it('moves to next page and updates range/pagination labels', () => {
    // Arrange — 6 rows so totalPages = 2 (pageSize = 5)
    component.reportRows = rowFixture as never;
    fixture.detectChanges();

    // Act
    component.onNextPage();
    fixture.detectChanges();

    // Assert
    expect(component.paginationLabel).toBe('Page 2 of 2');
    expect(component.rangeLabel).toBe('Showing 6-6 of 6 transactions');
    expect(component.visibleRows.length).toBe(1);
  });

  it('returns expected payment status classes', () => {
    // Arrange

    // Act
    const paidClass = component.getPaymentStatusClass('Paid');
    const pendingClass = component.getPaymentStatusClass('Pending');
    const failedClass = component.getPaymentStatusClass('Failed');
    const unknownClass = component.getPaymentStatusClass('Other');

    // Assert
    expect(paidClass).toContain('--paid');
    expect(pendingClass).toContain('--pending');
    expect(failedClass).toContain('--failed');
    expect(unknownClass).toContain('--default');
  });

  it('updates table period when a valid option is selected', () => {
    // Arrange

    // Act
    component.onTablePeriodChange('Last 30 days');

    // Assert
    expect(component.selectedTablePeriod).toBe('Last 30 days');
  });

  it('updates currency when a valid option is selected', () => {
    // Arrange

    // Act
    component.onCurrencyChange('COP');

    // Assert
    expect(component.selectedCurrency).toBe('COP');
  });

  it('renders empty message when no rows exist', () => {
    // Arrange
    const emptyFixture = TestBed.createComponent(PortalHotelesReportsPage);
    const emptyComponent = emptyFixture.componentInstance;
    emptyComponent.reportRows = [];

    // Act
    emptyFixture.detectChanges();
    const element = emptyFixture.nativeElement as HTMLElement;

    // Assert
    expect(element.textContent).toContain('No revenue transactions available.');
    expect(emptyComponent.hasRows).toBeFalse();
    expect(emptyComponent.rangeLabel).toBe('Showing 0-0 of 0 transactions');
  });

  describe('a11y', () => {
    it('renders the loading paragraph with aria-live and aria-atomic when isLoadingReport=true (AC-9)', () => {
      // Arrange
      component.isLoadingReport = true;

      // Act
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      const loadingMessages = Array.from(
        element.querySelectorAll('p.portal-hoteles-reports-table__message'),
      ).filter((p) => p.textContent?.includes('Loading reports'));

      // Assert
      expect(loadingMessages.length).toBe(1);
      const loading = loadingMessages[0];
      expect(loading.getAttribute('aria-live')).toBe('polite');
      expect(loading.getAttribute('aria-atomic')).toBe('true');
    });

    it('does not render the loading paragraph when isLoadingReport=false (AC-9)', () => {
      // Arrange
      component.isLoadingReport = false;

      // Act
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      const loadingMessages = Array.from(
        element.querySelectorAll('p.portal-hoteles-reports-table__message'),
      ).filter((p) => p.textContent?.includes('Loading reports'));

      // Assert
      expect(loadingMessages.length).toBe(0);
    });

    it('exposes accessible names on the PDF and Excel export buttons (AC-10)', () => {
      // Arrange

      // Act
      const element = fixture.nativeElement as HTMLElement;
      const exportButtons = element.querySelectorAll(
        '.portal-hoteles-reports-toolbar-header__export-button',
      );

      // Assert
      expect(exportButtons.length).toBe(2);
      const pdfButton = Array.from(exportButtons).find(
        (btn) => btn.textContent?.trim() === 'PDF',
      ) as HTMLElement | undefined;
      const excelButton = Array.from(exportButtons).find(
        (btn) => btn.textContent?.trim() === 'Excel',
      ) as HTMLElement | undefined;

      expect(pdfButton).toBeTruthy();
      expect(excelButton).toBeTruthy();
      expect(pdfButton?.getAttribute('aria-label')).toBe('Export report as PDF');
      expect(excelButton?.getAttribute('aria-label')).toBe('Download report as Excel');
    });

    it('keeps decorative KPI badge containers aria-hidden (AC-11)', () => {
      // Arrange
      component.kpiCards = kpiFixture as never;

      // Act
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      const badges = element.querySelectorAll('.portal-hoteles-reports-kpi__badge');

      // Assert
      expect(badges.length).toBeGreaterThan(0);
      badges.forEach((badge) => {
        expect(badge.getAttribute('aria-hidden')).toBe('true');
      });
    });
  });
});
