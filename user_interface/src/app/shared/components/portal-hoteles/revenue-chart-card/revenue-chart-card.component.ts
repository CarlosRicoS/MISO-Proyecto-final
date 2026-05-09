import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { IonicModule } from '@ionic/angular';
import * as echarts from 'echarts';
import type { ECharts, EChartsOption } from 'echarts';
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
export class PortalHotelesRevenueChartCardComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('chartHost') chartHost?: ElementRef<HTMLDivElement>;

  @Input() title = 'Revenue Overview';
  @Input() subtitle = 'Track monthly revenue trends';
  @Input() periodLabel = 'Last 6 months';
  @Input() periodOptions: string[] = ['Last 6 months'];
  @Input() categories: string[] = [];
  @Input() values: Array<number | string> = [];
  @Input() currencyPrefix = '$';
  @Input() yAxisTicks: number[] = [];
  @Input() ariaDescription = 'Revenue bar chart';
  @Input() maxValue?: number;

  @Output() periodChange = new EventEmitter<string>();

  private chartInstance?: ECharts;
  private viewInitialized = false;

  get hasData(): boolean {
    return this.chartPoints.length > 0;
  }

  get chartAriaLabel(): string {
    return this.hasData ? this.ariaDescription || 'Revenue overview chart' : 'No revenue data available.';
  }

  get chartPoints(): RevenueChartPoint[] {
    const size = Math.min(this.categories.length, this.values.length);
    if (!size) {
      return [];
    }

    return Array.from({ length: size }, (_, index) => ({
      category: this.categories[index],
      value: this.toNumericValue(this.values[index]),
    }));
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewInitialized) {
      return;
    }

    if (changes['categories'] || changes['values'] || changes['yAxisTicks'] || changes['maxValue'] || changes['ariaDescription']) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    this.chartInstance?.dispose();
    this.chartInstance = undefined;
  }

  get resolvedMaxValue(): number {
    if (typeof this.maxValue === 'number' && this.maxValue > 0) {
      return this.maxValue;
    }

    const computedMax = Math.max(...this.chartPoints.map((point) => point.value), 0);
    return computedMax > 0 ? computedMax : 1;
  }

  get resolvedTicks(): number[] {
    const explicitTicks = this.yAxisTicks
      .map((tick) => this.toNumericValue(tick))
      .filter((tick) => typeof tick === 'number' && tick >= 0 && !Number.isNaN(tick));
    if (explicitTicks.length) {
      return [...explicitTicks].sort((a, b) => b - a);
    }

    const max = this.resolvedMaxValue;
    if (typeof max !== 'number' || Number.isNaN(max) || max <= 0) {
      return [1, 0];
    }
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

  @HostListener('window:resize')
  onWindowResize(): void {
    this.chartInstance?.resize();
  }

  private toNumericValue(value: number | string | null | undefined): number {
    const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  private renderChart(): void {
    if (!this.chartHost?.nativeElement) {
      return;
    }

    const option = this.buildChartOption();
    if (!this.chartInstance) {
      this.chartInstance = echarts.init(this.chartHost.nativeElement);
    }

    this.chartInstance.setOption(option, true);
    this.chartInstance.resize();
  }

  private buildChartOption(): EChartsOption {
    const data = this.chartPoints;
    const maxValue = this.resolvedTicks[0] ?? this.resolvedMaxValue;
    const splitNumber = Math.max(this.resolvedTicks.length - 1, 1);
    const axisTextColor = this.themeColor('--th-neutral-600', '#667085');
    const splitLineColor = this.themeColor('--th-neutral-300', '#D0D5DD');
    const barColor = this.themeColor('--th-primary-500', '#4A6CF7');
    const barBorderColor = this.themeColor('--th-primary-700', '#2843C8');
    const barHoverColor = this.themeColor('--th-primary-600', '#3656E1');
    const labelColor = this.themeColor('--th-neutral-700', '#344054');

    return {
      backgroundColor: 'transparent',
      animation: true,
      grid: {
        left: 16,
        right: 16,
        top: 24,
        bottom: 28,
        containLabel: true,
      },
      tooltip: data.length
        ? {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            valueFormatter: (value: unknown) => this.formatCurrency(this.toNumericValue(value as number | string)),
          }
        : { show: false },
      xAxis: {
        type: 'category',
        data: data.map((point) => point.category),
        axisTick: { alignWithLabel: true },
        axisLine: { lineStyle: { color: axisTextColor } },
        axisLabel: {
          color: axisTextColor,
          margin: 14,
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: maxValue,
        splitNumber,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: axisTextColor,
          formatter: (value: number) => this.formatCurrency(value),
        },
        splitLine: {
          lineStyle: {
            color: splitLineColor,
            type: 'dashed',
          },
        },
      },
      series: data.length
        ? [
            {
              type: 'bar',
              data: data.map((point) => point.value),
              barMaxWidth: 48,
              itemStyle: {
                color: barColor,
                borderColor: barBorderColor,
                borderWidth: 1,
                borderRadius: [8, 8, 0, 0],
              },
              emphasis: {
                itemStyle: {
                  color: barHoverColor,
                },
              },
              label: {
                show: true,
                position: 'top',
                color: labelColor,
                formatter: (params: any) => this.formatCurrency(this.toNumericValue(params.value)),
              },
            },
          ]
        : [],
      graphic: data.length
        ? []
        : [
            {
              type: 'text',
              left: 'center',
              top: 'middle',
              style: {
                text: 'No revenue data available.',
                fill: axisTextColor,
                fontSize: 14,
                fontWeight: 500,
              },
            },
          ],
    };
  }

  private themeColor(variableName: string, fallback: string): string {
    if (typeof document === 'undefined') {
      return fallback;
    }

    const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
    return value || fallback;
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

  /**
   * Export the chart as a data URL image (PNG format).
   * Returns the data URL string or undefined if chart is not initialized.
   */
  exportChartAsImage(): string | undefined {
    if (!this.chartInstance) {
      return undefined;
    }

    try {
      return this.chartInstance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#fff',
      });
    } catch {
      return undefined;
    }
  }
}
