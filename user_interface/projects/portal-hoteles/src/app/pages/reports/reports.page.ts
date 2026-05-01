import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { PortalHotelesGridCardComponent } from '@travelhub/shared/components/portal-hoteles/grid-card/grid-card.component';
import { PortalHotelesRevenueChartCardComponent } from '@travelhub/shared/components/portal-hoteles/revenue-chart-card/revenue-chart-card.component';

@Component({
  selector: 'portal-hoteles-reports',
  templateUrl: './reports.page.html',
  styleUrls: ['./reports.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  readonly kpiCards: ReportKpiCard[] = [
    {
      label: 'Avg. Daily Revenue',
      value: '$4,760',
      trend: '+8.5% from previous week',
      trendClass: 'portal-hoteles-reports-kpi__trend--positive',
      icon: 'analytics-outline',
    },
    {
      label: 'Monthly Revenue',
      value: '$142,980',
      trend: '+14.2% from previous month',
      trendClass: 'portal-hoteles-reports-kpi__trend--positive',
      icon: 'cash-outline',
    },
  ];

  readonly chartCategories = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  readonly chartValues = [72000, 84000, 91000, 88000, 103000, 112000];
  readonly chartTicks = [120000, 90000, 60000, 30000, 0];

  reportRows: DailyRevenueRow[] = [
    {
      dateLabel: 'Apr 22, 2026',
      bookingId: 'BK-24891',
      guestLabel: 'Emily Carter',
      roomLabel: 'Deluxe Suite',
      paymentStatus: 'Paid',
      amount: 540,
    },
    {
      dateLabel: 'Apr 22, 2026',
      bookingId: 'BK-24892',
      guestLabel: 'Daniel Morgan',
      roomLabel: 'Standard Room',
      paymentStatus: 'Pending',
      amount: 220,
    },
    {
      dateLabel: 'Apr 23, 2026',
      bookingId: 'BK-24893',
      guestLabel: 'Sophia Taylor',
      roomLabel: 'Superior Double',
      paymentStatus: 'Paid',
      amount: 310,
    },
    {
      dateLabel: 'Apr 23, 2026',
      bookingId: 'BK-24894',
      guestLabel: 'Liam Robinson',
      roomLabel: 'Junior Suite',
      paymentStatus: 'Failed',
      amount: 460,
    },
    {
      dateLabel: 'Apr 24, 2026',
      bookingId: 'BK-24895',
      guestLabel: 'Olivia Diaz',
      roomLabel: 'Deluxe Suite',
      paymentStatus: 'Paid',
      amount: 520,
    },
    {
      dateLabel: 'Apr 24, 2026',
      bookingId: 'BK-24896',
      guestLabel: 'Noah Kim',
      roomLabel: 'Standard Room',
      paymentStatus: 'Refunded',
      amount: 190,
    },
  ];

  get visibleRows(): DailyRevenueRow[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.reportRows.slice(startIndex, endIndex);
  }

  get hasRows(): boolean {
    return this.visibleRows.length > 0;
  }

  get totalRows(): number {
    return this.reportRows.length;
  }

  get totalPages(): number {
    if (!this.totalRows) {
      return 1;
    }

    return Math.ceil(this.totalRows / this.pageSize);
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
  }

  onTablePeriodChange(nextPeriod: string): void {
    if (!nextPeriod) {
      return;
    }

    this.selectedTablePeriod = nextPeriod;
  }

  onCurrencyChange(nextCurrency: string): void {
    if (!nextCurrency) {
      return;
    }

    this.selectedCurrency = nextCurrency;
  }

  onPreviousPage(): void {
    if (!this.canGoToPreviousPage) {
      return;
    }

    this.currentPage -= 1;
  }

  onNextPage(): void {
    if (!this.canGoToNextPage) {
      return;
    }

    this.currentPage += 1;
  }

  formatAmount(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }

  getPaymentStatusClass(status: string): string {
    const normalizedStatus = (status || '').trim().toLowerCase();

    switch (normalizedStatus) {
      case 'paid':
        return 'portal-hoteles-reports-table-status portal-hoteles-reports-table-status--paid';
      case 'pending':
        return 'portal-hoteles-reports-table-status portal-hoteles-reports-table-status--pending';
      case 'failed':
        return 'portal-hoteles-reports-table-status portal-hoteles-reports-table-status--failed';
      case 'refunded':
        return 'portal-hoteles-reports-table-status portal-hoteles-reports-table-status--refunded';
      default:
        return 'portal-hoteles-reports-table-status portal-hoteles-reports-table-status--default';
    }
  }
}

interface ReportKpiCard {
  label: string;
  value: string;
  trend: string;
  trendClass: string;
  icon: string;
}

interface DailyRevenueRow {
  dateLabel: string;
  bookingId: string;
  guestLabel: string;
  roomLabel: string;
  paymentStatus: string;
  amount: number;
}
