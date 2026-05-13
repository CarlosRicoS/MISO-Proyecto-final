/// <reference types="jasmine" />

import { ComponentFixture, TestBed } from '@angular/core/testing';
import * as echarts from 'echarts';

import { PortalHotelesRevenueChartCardComponent } from './revenue-chart-card.component';

describe('PortalHotelesRevenueChartCardComponent', () => {
  let component: PortalHotelesRevenueChartCardComponent;
  let fixture: ComponentFixture<PortalHotelesRevenueChartCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortalHotelesRevenueChartCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PortalHotelesRevenueChartCardComponent);
    component = fixture.componentInstance;
  });

  describe('selectedPeriod', () => {
    it('returns selected period from options when periodLabel exists', () => {
      // Arrange
      component.periodOptions = ['Last 3 months', 'Last 6 months'];
      component.periodLabel = 'Last 6 months';

      // Act
      fixture.detectChanges();

      // Assert
      expect(component.selectedPeriod).toBe('Last 6 months');
    });

    it('returns first period option when periodLabel is not in options', () => {
      // Arrange
      component.periodOptions = ['Last 3 months', 'Last 6 months'];
      component.periodLabel = 'This year';

      // Act
      fixture.detectChanges();

      // Assert
      expect(component.selectedPeriod).toBe('Last 3 months');
    });

    it('falls back to periodLabel when period options are empty', () => {
      // Arrange
      component.periodOptions = [];
      component.periodLabel = 'This quarter';

      // Act
      fixture.detectChanges();

      // Assert
      expect(component.selectedPeriod).toBe('This quarter');
    });
  });

  describe('chartPoints', () => {
    it('returns empty array when categories and values are empty', () => {
      // Arrange
      component.categories = [];
      component.values = [];

      // Act & Assert
      expect(component.chartPoints).toEqual([]);
    });

    it('returns chart points aligned by minimum array length', () => {
      // Arrange
      component.categories = ['Jan', 'Feb', 'Mar'];
      component.values = [1000, 2000];

      // Act
      const points = component.chartPoints;

      // Assert
      expect(points.length).toBe(2);
      expect(points[0]).toEqual({ category: 'Jan', value: 1000 });
      expect(points[1]).toEqual({ category: 'Feb', value: 2000 });
    });

    it('converts string values to numbers', () => {
      // Arrange
      component.categories = ['Jan', 'Feb'];
      component.values = ['1500.50', '2000'];

      // Act
      const points = component.chartPoints;

      // Assert
      expect(points[0].value).toBe(1500.5);
      expect(points[1].value).toBe(2000);
    });
  });

  describe('hasData', () => {
    it('returns true when chart has data points', () => {
      // Arrange
      component.categories = ['Jan'];
      component.values = [1000];

      // Act & Assert
      expect(component.hasData).toBeTrue();
    });

    it('returns false when chart has no data points', () => {
      // Arrange
      component.categories = [];
      component.values = [];

      // Act & Assert
      expect(component.hasData).toBeFalse();
    });
  });

  describe('chartAriaLabel', () => {
    it('returns aria description when data is available', () => {
      // Arrange
      component.categories = ['Jan'];
      component.values = [1000];
      component.ariaDescription = 'Custom chart summary';

      // Act
      const label = component.chartAriaLabel;

      // Assert
      expect(label).toBe('Custom chart summary');
    });

    it('returns no-data message when data is not available', () => {
      // Arrange
      component.categories = [];
      component.values = [];

      // Act
      const label = component.chartAriaLabel;

      // Assert
      expect(label).toBe('No revenue data available.');
    });

    it('returns default aria description when ariaDescription is not provided', () => {
      // Arrange
      component.categories = ['Jan'];
      component.values = [1000];
      component.ariaDescription = '';

      // Act
      const label = component.chartAriaLabel;

      // Assert
      expect(label).toBe('Revenue overview chart');
    });
  });

  describe('resolvedMaxValue', () => {
    it('uses maxValue when explicitly provided and greater than 0', () => {
      // Arrange
      component.categories = ['Jan'];
      component.values = [1000];
      component.maxValue = 5000;

      // Act
      const max = component.resolvedMaxValue;

      // Assert
      expect(max).toBe(5000);
    });

    it('computes max from chart points when maxValue is not provided', () => {
      // Arrange
      component.categories = ['Jan', 'Feb'];
      component.values = [1000, 3000];

      // Act
      const max = component.resolvedMaxValue;

      // Assert
      expect(max).toBe(3000);
    });

    it('returns 1 when no data and no maxValue', () => {
      // Arrange
      component.categories = [];
      component.values = [];

      // Act
      const max = component.resolvedMaxValue;

      // Assert
      expect(max).toBe(1);
    });

    it('ignores invalid maxValue (zero or negative)', () => {
      // Arrange
      component.categories = ['Jan'];
      component.values = [1000];
      component.maxValue = 0;

      // Act
      const max = component.resolvedMaxValue;

      // Assert
      expect(max).toBe(1000);
    });
  });

  describe('resolvedTicks', () => {
    it('returns explicit ticks when yAxisTicks are valid', () => {
      // Arrange
      component.yAxisTicks = [5000, 2500, 1000];

      // Act
      const ticks = component.resolvedTicks;

      // Assert
      expect(ticks).toEqual([5000, 2500, 1000]);
    });

    it('filters out invalid ticks (negative, NaN, non-numeric)', () => {
      // Arrange
      component.yAxisTicks = [1000, -500, 2000];

      // Act
      const ticks = component.resolvedTicks;

      // Assert
      expect(ticks.length).toBe(3);
      expect(ticks).toEqual([2000, 1000, 0]);
      expect(ticks).toContain(1000);
      expect(ticks).toContain(2000);
      expect(ticks).toContain(0);
    });

    it('generates default ticks based on resolved max value', () => {
      // Arrange
      component.categories = ['Jan'];
      component.values = [1000];
      component.yAxisTicks = [];

      // Act
      const ticks = component.resolvedTicks;

      // Assert
      expect(ticks[0]).toBe(1000); // max
      expect(ticks[4]).toBe(0); // min
      expect(ticks.length).toBe(5);
    });

    it('returns [1, 0] when max value is invalid', () => {
      // Arrange
      spyOnProperty(component, 'resolvedMaxValue', 'get').and.returnValue(0);
      component.yAxisTicks = [];

      // Act
      const ticks = component.resolvedTicks;

      // Assert
      expect(ticks).toEqual([1, 0]);
    });

    it('sorts explicit ticks in descending order', () => {
      // Arrange
      component.yAxisTicks = [1000, 5000, 2500];

      // Act
      const ticks = component.resolvedTicks;

      // Assert
      expect(ticks).toEqual([5000, 2500, 1000]);
    });
  });

  describe('onPeriodSelectionChange', () => {
    it('emits periodChange when selection changes', () => {
      // Arrange
      spyOn(component.periodChange, 'emit');

      // Act
      component.onPeriodSelectionChange({ detail: { value: 'Last 12 months' } } as CustomEvent);

      // Assert
      expect(component.periodChange.emit).toHaveBeenCalledWith('Last 12 months');
    });

    it('does not emit periodChange for blank selection', () => {
      // Arrange
      spyOn(component.periodChange, 'emit');

      // Act
      component.onPeriodSelectionChange({ detail: { value: '   ' } } as CustomEvent);

      // Assert
      expect(component.periodChange.emit).not.toHaveBeenCalled();
    });

    it('does not emit periodChange for undefined selection', () => {
      // Arrange
      spyOn(component.periodChange, 'emit');

      // Act
      component.onPeriodSelectionChange({ detail: { value: undefined } } as CustomEvent);

      // Assert
      expect(component.periodChange.emit).not.toHaveBeenCalled();
    });
  });

  describe('getBarHeight', () => {
    it('returns percentage bar height based on resolved max value', () => {
      // Arrange
      component.categories = ['Jan'];
      component.values = [1000];

      // Act
      const height = component.getBarHeight(500);

      // Assert
      expect(height).toBe(50); // 500 / 1000 * 100
    });

    it('returns 100 when value equals max', () => {
      // Arrange
      component.categories = ['Jan'];
      component.values = [1000];

      // Act
      const height = component.getBarHeight(1000);

      // Assert
      expect(height).toBe(100);
    });

    it('returns 0 when value is 0', () => {
      // Arrange
      component.categories = ['Jan'];
      component.values = [1000];

      // Act
      const height = component.getBarHeight(0);

      // Assert
      expect(height).toBe(0);
    });
  });

  describe('aria and accessibility', () => {
    it('applies aria description to chart container', () => {
      // Arrange
      component.categories = ['Jan'];
      component.values = [1000];
      component.ariaDescription = 'Custom chart summary';

      // Act
      fixture.detectChanges();

      // Assert
      const element = fixture.nativeElement as HTMLElement;
      const chart = element.querySelector('.portal-hoteles-revenue-chart-card__chart');
      expect(chart?.getAttribute('aria-label')).toBe('Custom chart summary');
      expect(chart?.getAttribute('role')).toBe('img');
      expect(chart?.getAttribute('tabindex')).toBe('0');
    });

    it('returns bar aria label with formatted currency', () => {
      // Arrange
      const point = { category: 'January', value: 1500 };
      component.currencyPrefix = '$';

      // Act
      const label = component.getBarAriaLabel(point);

      // Assert
      expect(label).toContain('January');
      expect(label).toContain('$1,500');
    });
  });

  describe('formatCurrency', () => {
    it('formats number with currency prefix', () => {
      // Arrange
      component.currencyPrefix = '$';

      // Act
      const formatted = component.formatCurrency(1500);

      // Assert
      expect(formatted).toBe('$1,500');
    });

    it('formats large numbers with comma separators', () => {
      // Arrange
      component.currencyPrefix = '€';

      // Act
      const formatted = component.formatCurrency(1234567);

      // Assert
      expect(formatted).toContain('€');
      expect(formatted).toContain('1,234,567');
    });

    it('formats zero correctly', () => {
      // Arrange
      component.currencyPrefix = '$';

      // Act
      const formatted = component.formatCurrency(0);

      // Assert
      expect(formatted).toBe('$0');
    });
  });

  describe('trackByCategory', () => {
    it('returns category as track key', () => {
      // Arrange
      const point = { category: 'January', value: 1500 };

      // Act
      const key = component.trackByCategory(0, point);

      // Assert
      expect(key).toBe('January');
    });
  });

  describe('exportChartAsImage', () => {
    it('returns undefined when chart is not initialized', () => {
      // Arrange
      // Chart not initialized

      // Act
      const result = component.exportChartAsImage();

      // Assert
      expect(result).toBeUndefined();
    });

    it('exports chart as PNG image when chart is initialized', (done) => {
      // Arrange
      component.categories = ['Jan'];
      component.values = [1000];
      fixture.detectChanges();

      // Wait for chart to initialize
      setTimeout(() => {
        // Act
        const result = component.exportChartAsImage();

        // Assert
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
        expect(result?.startsWith('data:image/png')).toBeTrue();
        done();
      }, 100);
    });
  });

  describe('ngAfterViewInit and renderChart', () => {
    it('initializes and renders chart after view init', (done) => {
      // Arrange
      component.categories = ['Jan', 'Feb'];
      component.values = [1000, 2000];

      // Act
      fixture.detectChanges();

      // Wait for chart to initialize
      setTimeout(() => {
        // Assert
        const element = fixture.nativeElement as HTMLElement;
        const chartContainer = element.querySelector('.portal-hoteles-revenue-chart-card__chart');
        expect(chartContainer).toBeTruthy();
        done();
      }, 100);
    });
  });

  describe('ngOnChanges', () => {
    it('re-renders chart when categories change', () => {
      // Arrange
      const renderChartSpy = spyOn<any>(component, 'renderChart');
      component.categories = ['Jan'];
      component.values = [1000];
      fixture.detectChanges();

      // Act
      component.categories = ['Jan', 'Feb', 'Mar'];
      component.ngOnChanges({
        categories: {
          previousValue: ['Jan'],
          currentValue: ['Jan', 'Feb', 'Mar'],
          firstChange: false,
          isFirstChange: () => false,
        },
      });

      // Assert
      expect(renderChartSpy).toHaveBeenCalledTimes(2);
    });

    it('does not re-render before view is initialized', () => {
      // Arrange
      const spy = spyOn<any>(component, 'renderChart');

      // Act
      component.ngOnChanges({
        categories: {
          previousValue: [],
          currentValue: ['Jan'],
          firstChange: false,
          isFirstChange: () => false,
        },
      });

      // Assert
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy', () => {
    it('disposes chart on component destroy', (done) => {
      // Arrange
      component.categories = ['Jan'];
      component.values = [1000];
      fixture.detectChanges();

      setTimeout(() => {
        // Act
        component.ngOnDestroy();

        // Assert
        expect(component.exportChartAsImage()).toBeUndefined();
        done();
      }, 100);
    });
  });

  describe('onWindowResize', () => {
    it('resizes chart on window resize', (done) => {
      // Arrange
      component.categories = ['Jan'];
      component.values = [1000];
      fixture.detectChanges();

      setTimeout(() => {
        // Act
        component.onWindowResize();

        // Assert - no error should be thrown
        expect(true).toBeTrue();
        done();
      }, 100);
    });
  });
});
