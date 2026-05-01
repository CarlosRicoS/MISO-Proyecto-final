import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { PortalHotelesGridCardComponent } from '@travelhub/shared/components/portal-hoteles/grid-card/grid-card.component';

interface RevenueChartPoint {
  category: string;
  value: number;
}

@Component({
  selector: 'portal-hoteles-revenue-chart-card',
  templateUrl: './revenue-chart-card.component.html',
  styleUrls: ['./revenue-chart-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, PortalHotelesGridCardComponent],
})
export class PortalHotelesRevenueChartCardComponent {
  @Input() title = 'Revenue Overview';
  @Input() subtitle = 'Track monthly revenue trends';
  @Input() periodLabel = 'Last 6 months';
  @Input() periodOptions: string[] = ['Last 6 months'];
  @Input() categories: string[] = [];
  @Input() values: number[] = [];
  @Input() currencyPrefix = '$';
  @Input() yAxisTicks: number[] = [];
  @Input() ariaDescription = 'Revenue bar chart';
  @Input() maxValue?: number;

  @Output() periodChange = new EventEmitter<string>();

  get hasData(): boolean {
    return this.chartPoints.length > 0;
  }

  get chartPoints(): RevenueChartPoint[] {
    const size = Math.min(this.categories.length, this.values.length);
    if (!size) {
      return [];
    }

    return Array.from({ length: size }, (_, index) => ({
      category: this.categories[index],
      value: Math.max(0, this.values[index] ?? 0),
    }));
  }

  get resolvedMaxValue(): number {
    if (typeof this.maxValue === 'number' && this.maxValue > 0) {
      return this.maxValue;
    }

    const computedMax = Math.max(...this.chartPoints.map((point) => point.value), 0);
    return computedMax > 0 ? computedMax : 1;
  }

  get resolvedTicks(): number[] {
    const explicitTicks = this.yAxisTicks.filter((tick) => Number.isFinite(tick) && tick >= 0);
    if (explicitTicks.length) {
      return [...explicitTicks].sort((a, b) => b - a);
    }

    const max = this.resolvedMaxValue;
    return [max, Math.round(max * 0.75), Math.round(max * 0.5), Math.round(max * 0.25), 0];
  }

  get selectedPeriod(): string {
    if (this.periodOptions.includes(this.periodLabel)) {
      return this.periodLabel;
    }

    return this.periodOptions[0] || this.periodLabel;
  }

  onPeriodSelectionChange(event: CustomEvent): void {
    const nextValue = String(event.detail.value || '').trim();
    if (!nextValue) {
      return;
    }

    this.periodChange.emit(nextValue);
  }

  getBarHeight(value: number): number {
    return (value / this.resolvedMaxValue) * 100;
  }

  formatCurrency(value: number): string {
    const formatted = new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(value);

    return `${this.currencyPrefix}${formatted}`;
  }

  getBarAriaLabel(point: RevenueChartPoint): string {
    return `${point.category}: ${this.formatCurrency(point.value)}`;
  }

  trackByCategory(_index: number, point: RevenueChartPoint): string {
    return point.category;
  }
}
