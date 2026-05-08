import { CommonModule, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, ViewChild } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import jsPDF from 'jspdf';
import { AuthSessionService } from '@travelhub/core/services/auth-session.service';
import { LocaleService } from '@travelhub/core/services/locale.service';
import { ReportsService, IncomingReportRecord, DashboardMetricsResponse } from '@travelhub/core/services/reports.service';
import { PortalHotelesGridCardComponent } from '@travelhub/shared/components/portal-hoteles/grid-card/grid-card.component';
import { PortalHotelesRevenueChartCardComponent } from '@travelhub/shared/components/portal-hoteles/revenue-chart-card/revenue-chart-card.component';
import { SupportedCurrencyCode, ThCurrencyPipe } from '@travelhub/shared/pipes/th-currency.pipe';

@Component({
  selector: 'portal-hoteles-reports',
  templateUrl: './reports.page.html',
  styleUrls: ['./reports.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    IonicModule,
    TranslateModule,
    PortalHotelesGridCardComponent,
    PortalHotelesRevenueChartCardComponent,
    ThCurrencyPipe,
  ],
})
export class PortalHotelesReportsPage implements OnInit, OnDestroy {
  private readonly pageSize = 5;
  private currentPage = 1;

  @ViewChild('chartComponent') chartComponent?: PortalHotelesRevenueChartCardComponent;

  private readonly translate = inject(TranslateService);
  private readonly localeService = inject(LocaleService);
  private readonly destroy$ = new Subject<void>();

  chartPeriodOptions: string[] = [];
  tablePeriodOptions: string[] = [];
  readonly currencyOptions: SupportedCurrencyCode[] = ['USD', 'EUR', 'COP'];

  chartPeriod = '';
  selectedTablePeriod = '';
  selectedCurrency: SupportedCurrencyCode = 'USD';

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
    if (!this.isSupportedCurrencyCode(nextCurrency)) return;
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
      const blob = await this.downloadRevenueCsvBlob();
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

  async onDownloadPdf(): Promise<void> {
    try {
      const csvText = await this.downloadRevenueCsvText();
      const rows = this.parseCsv(csvText);
      const pdf = this.buildRevenuePdf(rows);
      pdf.save(`revenue_report_${new Date().toISOString().split('T')[0]}.pdf`);
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
      this.chartValues = overview.map((d) => this.toNumericRevenue(d.total_revenue));
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
      this.chartValues = overview.map((d) => this.toNumericRevenue(d.total_revenue));
      this.chartTicks = this.computeChartTicks(this.chartValues);
    } catch {
      // keep previous chart data on error
    }
  }

  private computeChartTicks(values: number[]): number[] {
    if (!values.length) return [12000, 9000, 6000, 3000, 0];

    const maxValue = Math.max(...values.map((value) => this.toNumericRevenue(value)));
    if (maxValue <= 0) return [1000, 750, 500, 250, 0];

    const step = maxValue / 4;
    return [maxValue, step * 3, step * 2, step, 0];
  }

  private toNumericRevenue(value: number | string | null | undefined): number {
    const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private isSupportedCurrencyCode(value: string): value is SupportedCurrencyCode {
    return value === 'USD' || value === 'EUR' || value === 'COP';
  }

  private async downloadRevenueCsvBlob(): Promise<Blob> {
    return firstValueFrom(this.reportsService.downloadCsv(this.authSession.idToken));
  }

  private async downloadRevenueCsvText(): Promise<string> {
    const blob = await this.downloadRevenueCsvBlob();
    const text = await blob.text();
    return text.replace(/^\uFEFF/, '');
  }

  private parseCsv(csvText: string): string[][] {
    const normalized = (csvText || '').trim();
    if (!normalized) {
      return [];
    }

    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let index = 0; index < normalized.length; index += 1) {
      const character = normalized[index];
      const nextCharacter = normalized[index + 1];

      if (character === '"') {
        if (inQuotes && nextCharacter === '"') {
          currentCell += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (character === ',' && !inQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
        continue;
      }

      if ((character === '\n' || character === '\r') && !inQuotes) {
        if (character === '\r' && nextCharacter === '\n') {
          index += 1;
        }

        currentRow.push(currentCell.trim());
        if (currentRow.some((cell) => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
        continue;
      }

      currentCell += character;
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  private buildRevenuePdf(rows: string[][]): jsPDF {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginX = 32;
    let currentTopY = 20;
    const contentWidth = pageWidth - marginX * 2;
    const lineHeight = 12;
    const headerHeight = 28;
    const bodyMinHeight = 22;
    const chartSectionTitle = this.translate.instant('REPORTS.REVENUE_OVERVIEW_TITLE');

    // ===== ADD CHART IMAGE IF AVAILABLE =====
    const chartImageUrl = this.chartComponent?.exportChartAsImage();
    if (chartImageUrl) {
      const chartWidth = contentWidth;
      const chartHeight = 180; // Fixed height for chart

      try {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(31, 41, 55);
        pdf.text(chartSectionTitle, marginX, currentTopY);
        currentTopY += 16;

        pdf.addImage(chartImageUrl, 'PNG', marginX, currentTopY, chartWidth, chartHeight);
        currentTopY += chartHeight + 20; // Add spacing after chart
      } catch {
        // If chart image fails to render, continue with table only
      }
    }

    // ===== TITLE BLOCK WITH DATE RANGE =====
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text(this.translate.instant('REPORTS.TITLE'), marginX, currentTopY);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(102, 112, 133);
    pdf.text(this.translate.instant('REPORTS.REVENUE_OVERVIEW_TITLE'), marginX, currentTopY + 18);

    // Extract and display date range from data
    const tableRows = rows.filter((row) => row.some((cell) => cell.length > 0));
    if (tableRows.length > 1) {
      const bodyRows = tableRows.slice(1);
      if (bodyRows.length > 0) {
        const dateRangeText = this.extractDateRangeForPdf(bodyRows);
        if (dateRangeText) {
          pdf.setFontSize(9);
          pdf.setTextColor(140, 150, 170);
          pdf.text(dateRangeText, marginX, currentTopY + 32);
        }
      }
    }
    pdf.setTextColor(0, 0, 0);

    const tableStartY = currentTopY + 44;

    if (!tableRows.length) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      pdf.text('No revenue data available.', marginX, tableStartY);
      return pdf;
    }

    const headers = tableRows[0];
    const bodyRows = tableRows.slice(1);
    const columnWidths = this.getPdfColumnWidths(headers, contentWidth);

    // Helper: Parse numeric values from cells
    const parseNumericValue = (value: string): number => {
      const cleaned = (value || '').replace(/[^\d.-]/g, '');
      return Number.parseFloat(cleaned) || 0;
    };

    // Helper: Format cell value back to string (with currency for numeric columns)
    const formatCellValue = (value: string, columnIndex: number): string => {
      const header = headers[columnIndex] || '';
      const isNumeric = header.toLowerCase().includes('gross') || 
                        header.toLowerCase().includes('net') || 
                        header.toLowerCase().includes('value') ||
                        header.toLowerCase().includes('income') ||
                        header.toLowerCase().includes('tax') ||
                        header.toLowerCase().includes('commission');
      
      if (isNumeric && value) {
        const numValue = parseNumericValue(value);
        return this.formatAmount(numValue);
      }
      return value;
    };

    // Calculate totals for numeric columns
    const totalsRow = headers.map((header, columnIndex) => {
      const isNumeric = header.toLowerCase().includes('gross') || 
                        header.toLowerCase().includes('net') || 
                        header.toLowerCase().includes('value') ||
                        header.toLowerCase().includes('income') ||
                        header.toLowerCase().includes('tax') ||
                        header.toLowerCase().includes('commission');
      
      if (columnIndex === 0) {
        // First column shows "TOTAL"
        return this.translate.instant('REPORTS.TOTAL_LABEL') || 'TOTAL';
      } else if (isNumeric) {
        // Sum numeric columns
        const sum = bodyRows.reduce((acc, row) => {
          const value = row[columnIndex] || '0';
          return acc + parseNumericValue(value);
        }, 0);
        return this.formatAmount(sum);
      }
      return '—';
    });

    const drawRow = (row: string[], y: number, isHeader: boolean, isTotals: boolean = false): number => {
      let x = marginX;
      let rowHeight = isHeader ? headerHeight : bodyMinHeight;

      headers.forEach((_, columnIndex) => {
        const cell = row[columnIndex] || '';
        const width = columnWidths[columnIndex] || columnWidths[columnWidths.length - 1] || 80;
        const lines = pdf.splitTextToSize(cell, width - 10) as string[];
        const cellHeight = Math.max(isHeader ? headerHeight : bodyMinHeight, lines.length * lineHeight + 10);
        rowHeight = Math.max(rowHeight, cellHeight);

        // Determine row colors
        let bgColor = [255, 255, 255]; // default white
        if (isHeader) {
          bgColor = [42, 48, 75]; // blue header
        } else if (isTotals) {
          bgColor = [20, 25, 55]; // darker blue for totals
        } else {
          // Alternating row colors for body rows (light gray for even rows)
          const rowIndex = bodyRows.indexOf(row);
          if (rowIndex >= 0 && rowIndex % 2 === 0) {
            bgColor = [245, 246, 248]; // light gray
          }
        }

        pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        pdf.setDrawColor(210, 213, 221);
        pdf.rect(x, y, width, cellHeight, 'F');
        if (!isHeader && !isTotals) {
          pdf.rect(x, y, width, cellHeight, 'S');
        }

        pdf.setFontSize(isHeader ? 10 : isTotals ? 9 : 9);
        pdf.setFont('helvetica', isHeader || isTotals ? 'bold' : 'normal');
        
        let textColor = [16, 24, 40]; // dark gray for body
        if (isHeader) {
          textColor = [255, 255, 255]; // white for header
        } else if (isTotals) {
          textColor = [255, 255, 255]; // white for totals
        }
        pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
        pdf.text(lines, x + 5, y + 16);

        x += width;
      });

      return rowHeight;
    };

    let currentY = tableStartY;
    currentY += drawRow(headers, currentY, true);

    bodyRows.forEach((row) => {
      const estimatedHeight = Math.max(
        bodyMinHeight,
        ...row.map((cell, columnIndex) => {
          const width = columnWidths[columnIndex] || columnWidths[columnWidths.length - 1] || 80;
          const lines = pdf.splitTextToSize(cell || '', width - 10) as string[];
          return lines.length * lineHeight + 10;
        }),
      );

      if (currentY + estimatedHeight > pageHeight - 80) {
        pdf.addPage();
        currentY = 40;
        // Re-draw header on new page
        let headerX = marginX;
        headers.forEach((header, columnIndex) => {
          const width = columnWidths[columnIndex] || columnWidths[columnWidths.length - 1] || 80;
          pdf.setFillColor(42, 48, 75);
          pdf.setDrawColor(210, 213, 221);
          pdf.rect(headerX, currentY, width, headerHeight, 'F');
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(255, 255, 255);
          const lines = pdf.splitTextToSize(header, width - 10) as string[];
          pdf.text(lines, headerX + 5, currentY + 16);
          headerX += width;
        });
        currentY += headerHeight;
        pdf.setTextColor(0, 0, 0);
      }

      drawRow(row, currentY, false);
      currentY += estimatedHeight;
    });

    // ===== DRAW TOTALS ROW =====
    const totalsEstimatedHeight = Math.max(
      bodyMinHeight,
      ...totalsRow.map((cell, columnIndex) => {
        const width = columnWidths[columnIndex] || columnWidths[columnWidths.length - 1] || 80;
        const lines = pdf.splitTextToSize(cell || '', width - 10) as string[];
        return lines.length * lineHeight + 10;
      }),
    );

    if (currentY + totalsEstimatedHeight > pageHeight - 36) {
      pdf.addPage();
      currentY = 40;
      // Re-draw header on new page before totals
      let headerX = marginX;
      headers.forEach((header, columnIndex) => {
        const width = columnWidths[columnIndex] || columnWidths[columnWidths.length - 1] || 80;
        pdf.setFillColor(42, 48, 75);
        pdf.setDrawColor(210, 213, 221);
        pdf.rect(headerX, currentY, width, headerHeight, 'F');
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        const lines = pdf.splitTextToSize(header, width - 10) as string[];
        pdf.text(lines, headerX + 5, currentY + 16);
        headerX += width;
      });
      currentY += headerHeight;
    }

    drawRow(totalsRow, currentY, false, true);

    return pdf;
  }

  private extractDateRangeForPdf(bodyRows: string[][]): string {
    if (!bodyRows.length) return '';

    // Assume first column is date (index 0)
    const firstDateStr = bodyRows[0]?.[0] || '';
    const lastDateStr = bodyRows[bodyRows.length - 1]?.[0] || '';

    if (!firstDateStr || !lastDateStr) return '';

    // Check if date format looks like "MMM D, YYYY"
    if (firstDateStr === lastDateStr) {
      return `Period: ${firstDateStr}`;
    }
    return `Period: ${firstDateStr} — ${lastDateStr}`;
  }

  private getPdfColumnWidths(headerRow: string[], contentWidth: number): number[] {
    const widths = headerRow.map((header) => {
      const normalized = header.toLowerCase();
      if (normalized.includes('date')) return 92;
      if (normalized.includes('booking') || normalized.includes('code')) return 88;
      if (normalized.includes('payment')) return 100;
      if (normalized.includes('status')) return 78;
      if (normalized.includes('gross') || normalized.includes('net') || normalized.includes('value') || normalized.includes('income')) return 88;
      return 84;
    });

    const totalWidth = widths.reduce((sum, width) => sum + width, 0);
    if (totalWidth <= contentWidth) {
      return widths;
    }

    const scale = contentWidth / totalWidth;
    return widths.map((width) => Math.max(56, Math.floor(width * scale)));
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
      grossValue: this.toNumericRevenue(record.gross_value),
      netIncome: this.toNumericRevenue(record.net_income),
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
