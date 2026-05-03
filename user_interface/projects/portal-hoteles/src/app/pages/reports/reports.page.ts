import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { AuthSessionService } from '@travelhub/core/services/auth-session.service';
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
    PortalHotelesGridCardComponent,
    PortalHotelesRevenueChartCardComponent,
  ],
})
export class PortalHotelesReportsPage {
  private readonly pageSize = 5;
  private currentPage = 1;

  readonly chartPeriodOptions = ['Last 6 months', 'Last 12 months'];
  readonly tablePeriodOptions = ['Last 7 days', 'Last 30 days'];
  readonly currencyOptions = ['USD', 'EUR', 'COP'];

  chartPeriod = 'Last 6 months';
  selectedTablePeriod = 'Last 7 days';
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
  ) {}

  ionViewWillEnter(): void {
    void this.loadReportData();
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
    return `Page ${this.currentPage} of ${this.totalPages}`;
  }

  get rangeLabel(): string {
    if (!this.totalRows) {
      return 'Showing 0-0 of 0 transactions';
    }
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = start + this.visibleRows.length - 1;
    return `Showing ${start}-${end} of ${this.totalRows} transactions`;
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value || 0);
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
    const months = this.chartPeriod === 'Last 12 months' ? 12 : 6;

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
      this.reportErrorMessage = 'Unable to load report data.';
    } finally {
      this.isLoadingReport = false;
    }
  }

  private async loadChartData(): Promise<void> {
    const token = this.authSession.idToken;
    const months = this.chartPeriod === 'Last 12 months' ? 12 : 6;
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
    const trendLabel = `${trendSign}${trendPct.toFixed(1)}% from previous month`;
    const trendClass = trendPct >= 0
      ? 'portal-hoteles-reports-kpi__trend--positive'
      : 'portal-hoteles-reports-kpi__trend--negative';

    return [
      {
        label: 'Avg. Daily Revenue',
        value: this.formatAmount(metrics.avg_daily_revenue),
        trend: trendLabel,
        trendClass,
        icon: 'analytics-outline',
      },
      {
        label: 'Monthly Revenue',
        value: this.formatAmount(metrics.monthly_revenue),
        trend: trendLabel,
        trendClass,
        icon: 'cash-outline',
      },
    ];
  }

  private toRow(record: IncomingReportRecord): IncomingReportRow {
    const dateLabel = record.payment_date
      ? new Date(record.payment_date).toLocaleDateString('en-US', {
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
