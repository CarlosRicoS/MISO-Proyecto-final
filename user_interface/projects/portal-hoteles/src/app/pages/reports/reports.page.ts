import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthSessionService } from '@travelhub/core/services/auth-session.service';
import { LocaleService } from '@travelhub/core/services/locale.service';
import { ReportsService, IncomingReportRecord, DashboardMetricsResponse } from '@travelhub/core/services/reports.service';
import { PortalHotelesGridCardComponent } from '@travelhub/shared/components/portal-hoteles/grid-card/grid-card.component';
import { PortalHotelesRevenueChartCardComponent } from '@travelhub/shared/components/portal-hoteles/revenue-chart-card/revenue-chart-card.component';

@Component({
  selector: 'portal-hoteles-reports',
  templateUrl: './reports.page.html',
  styleUrls: ['./reports.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule,
    PortalHotelesGridCardComponent,
    PortalHotelesRevenueChartCardComponent,
  ],
})
export class PortalHotelesReportsPage implements OnInit, OnDestroy {
  private readonly pageSize = 5;
  private currentPage = 1;

  private readonly translate = inject(TranslateService);
  private readonly localeService = inject(LocaleService);
  private readonly destroy$ = new Subject<void>();

  chartPeriodOptions: string[] = [];
  tablePeriodOptions: string[] = [];
  readonly currencyOptions = ['USD', 'EUR', 'COP'];

  chartPeriod = '';
  selectedTablePeriod = '';
  selectedCurrency = 'USD';

  kpiCards: ReportKpiCard[] = [];
  chartCategories: string[] = [];
  chartValues: number[] = [];
  chartTicks: number[] = [120000, 90000, 60000, 30000, 0];
  reportRows: IncomingReportRow[] = [];
  isLoadingReport = false;
  reportErrorMessage = '';

  constructor(
    private readonly authSession: AuthSessionService,
    private readonly reportsService: ReportsService,
  ) {
    this.refreshLocalizedOptions();
  }

  ngOnInit(): void {
    this.localeService.currentLang$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.refreshLocalizedOptions();
        if (this.kpiCards.length) {
          // Re-translate trend labels on language change.
          this.kpiCards = this.kpiCards.map((card) => ({
            ...card,
            value: this.formatAmount(this.parseAmount(card.value)),
          }));
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ionViewWillEnter(): void {
    void this.loadReportData();
  }

  private refreshLocalizedOptions(): void {
    const last6 = this.translate.instant('REPORTS.PERIOD_LAST_6');
    const last12 = this.translate.instant('REPORTS.PERIOD_LAST_12');
    const last7Days = this.translate.instant('REPORTS.PERIOD_LAST_7_DAYS');
    const last30Days = this.translate.instant('REPORTS.PERIOD_LAST_30_DAYS');

    this.chartPeriodOptions = [last6, last12];
    this.tablePeriodOptions = [last7Days, last30Days];
    this.chartPeriod = this.chartPeriod
      ? (this.chartPeriod === last12 || this.isLast12Period(this.chartPeriod) ? last12 : last6)
      : last6;
    this.selectedTablePeriod = this.selectedTablePeriod
      ? (this.selectedTablePeriod === last30Days || this.isLast30Period(this.selectedTablePeriod) ? last30Days : last7Days)
      : last7Days;
  }

  private isLast12Period(value: string): boolean {
    return value.toLowerCase().includes('12');
  }

  private isLast30Period(value: string): boolean {
    return value.toLowerCase().includes('30');
  }

  private parseAmount(formatted: string): number {
    const numeric = (formatted || '').replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
    const parsed = Number.parseFloat(numeric);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  get visibleRows(): IncomingReportRow[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.reportRows.slice(startIndex, startIndex + this.pageSize);
  }

  get hasRows(): boolean {
    return this.visibleRows.length > 0;
  }

  get totalRows(): number {
    return this.reportRows.length;
  }

  get totalPages(): number {
    return Math.ceil(this.totalRows / this.pageSize) || 1;
  }

  get canGoToPreviousPage(): boolean {
    return this.currentPage > 1;
  }

  get canGoToNextPage(): boolean {
    return this.currentPage < this.totalPages;
  }

  get paginationLabel(): string {
    return this.translate.instant('REPORTS.PAGE_OF', {
      current: this.currentPage,
      total: this.totalPages,
    });
  }

  get chartAriaDescription(): string {
    return this.translate.instant('REPORTS.ARIA_REVENUE_CHART', { period: this.chartPeriod });
  }

  get rangeLabel(): string {
    if (!this.totalRows) {
      return this.translate.instant('REPORTS.SHOWING_NONE');
    }
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = start + this.visibleRows.length - 1;
    return this.translate.instant('REPORTS.SHOWING_RANGE', {
      start,
      end,
      total: this.totalRows,
    });
  }

  get shouldShowPagination(): boolean {
    return this.totalRows > this.pageSize;
  }

  onChartPeriodChange(nextPeriod: string): void {
    this.chartPeriod = nextPeriod;
    void this.loadChartData();
  }

  onTablePeriodChange(nextPeriod: string): void {
    if (!nextPeriod) return;
    this.selectedTablePeriod = nextPeriod;
  }

  onCurrencyChange(nextCurrency: string): void {
    if (!nextCurrency) return;
    this.selectedCurrency = nextCurrency;
  }

  onPreviousPage(): void {
    if (!this.canGoToPreviousPage) return;
    this.currentPage -= 1;
  }

  onNextPage(): void {
    if (!this.canGoToNextPage) return;
    this.currentPage += 1;
  }

  async onDownloadCsv(): Promise<void> {
    try {
      const blob = await firstValueFrom(this.reportsService.downloadCsv(this.authSession.idToken));
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `revenue_report_${new Date().toISOString().split('T')[0]}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent — toast would go here in production
    }
  }

  formatAmount(value: number): string {
    return this.localeService.formatCurrency(value || 0);
  }

  getPaymentStatusClass(status: string): string {
    const s = (status || '').trim().toLowerCase();
    switch (s) {
      case 'paid':
      case 'confirmed':
        return 'portal-hoteles-reports-table-status portal-hoteles-reports-table-status--paid';
      case 'pending':
        return 'portal-hoteles-reports-table-status portal-hoteles-reports-table-status--pending';
      case 'failed':
      case 'cancelled':
      case 'canceled':
        return 'portal-hoteles-reports-table-status portal-hoteles-reports-table-status--failed';
      case 'refunded':
        return 'portal-hoteles-reports-table-status portal-hoteles-reports-table-status--refunded';
      default:
        return 'portal-hoteles-reports-table-status portal-hoteles-reports-table-status--default';
    }
  }

  private async loadReportData(): Promise<void> {
    this.isLoadingReport = true;
    this.reportErrorMessage = '';
    const token = this.authSession.idToken;
    const months = this.isLast12Period(this.chartPeriod) ? 12 : 6;

    try {
      const [incomingResp, overviewResp, metricsResp] = await Promise.all([
        firstValueFrom(this.reportsService.getIncomingReport(token)),
        firstValueFrom(this.reportsService.getRevenueOverview(token, months)),
        firstValueFrom(this.reportsService.getDashboardMetrics(token)),
      ]);

      this.reportRows = (incomingResp.records || []).map((r) => this.toRow(r));
      this.currentPage = 1;

      const overview = overviewResp.data || [];
      this.chartCategories = overview.map((d) => d.label);
      this.chartValues = overview.map((d) => d.total_revenue);
      this.chartTicks = this.computeChartTicks(this.chartValues);

      this.kpiCards = this.buildKpiCards(metricsResp);
    } catch {
      this.reportErrorMessage = this.translate.instant('REPORTS.ERROR');
    } finally {
      this.isLoadingReport = false;
    }
  }

  private async loadChartData(): Promise<void> {
    const token = this.authSession.idToken;
    const months = this.isLast12Period(this.chartPeriod) ? 12 : 6;
    try {
      const overviewResp = await firstValueFrom(this.reportsService.getRevenueOverview(token, months));
      const overview = overviewResp.data || [];
      this.chartCategories = overview.map((d) => d.label);
      this.chartValues = overview.map((d) => d.total_revenue);
      this.chartTicks = this.computeChartTicks(this.chartValues);
    } catch {
      // keep previous chart data on error
    }
  }

  private computeChartTicks(values: number[]): number[] {
    if (!values.length) return [12000, 9000, 6000, 3000, 0];
    const maxValue = Math.max(...values);
    if (maxValue === 0) return [1000, 750, 500, 250, 0];

    // Compute a "nice" step: find the order of magnitude of (maxValue / 3),
    // then round up to the nearest 1x/2x/5x multiple of that magnitude.
    const rawStep = maxValue / 3;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;
    const niceMultiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    const step = niceMultiplier * magnitude;

    return [step * 4, step * 3, step * 2, step, 0];
  }

  private buildKpiCards(metrics: DashboardMetricsResponse): ReportKpiCard[] {
    const trendPct = metrics.revenue_trend_pct ?? 0;
    const trendSign = trendPct >= 0 ? '+' : '';
    const trendLabel = this.translate.instant('REPORTS.TREND_FROM_PREVIOUS', {
      sign: trendSign,
      percent: trendPct.toFixed(1),
    });
    const trendClass = trendPct >= 0
      ? 'portal-hoteles-reports-kpi__trend--positive'
      : 'portal-hoteles-reports-kpi__trend--negative';

    return [
      {
        label: this.translate.instant('REPORTS.AVG_DAILY_REVENUE'),
        value: this.formatAmount(metrics.avg_daily_revenue),
        trend: trendLabel,
        trendClass,
        icon: 'analytics-outline',
      },
      {
        label: this.translate.instant('REPORTS.MONTHLY_REVENUE'),
        value: this.formatAmount(metrics.monthly_revenue),
        trend: trendLabel,
        trendClass,
        icon: 'cash-outline',
      },
    ];
  }

  private toRow(record: IncomingReportRecord): IncomingReportRow {
    const dateLabel = record.payment_date
      ? new Date(record.payment_date).toLocaleDateString(this.localeService.localeCode, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '—';

    return {
      dateLabel,
      bookingId: (record.booking_id || '').substring(0, 8),
      paymentRef: record.payment_reference || '—',
      grossValue: record.gross_value,
      netIncome: record.net_income,
      status: record.status || '—',
    };
  }
}

interface ReportKpiCard {
  label: string;
  value: string;
  trend: string;
  trendClass: string;
  icon: string;
}

interface IncomingReportRow {
  dateLabel: string;
  bookingId: string;
  paymentRef: string;
  grossValue: number;
  netIncome: number;
  status: string;
}
