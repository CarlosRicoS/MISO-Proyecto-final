/// <reference types="jasmine" />

import { ComponentFixture, TestBed } from '@angular/core/testing';

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

  it('creates with minimal defaults', () => {
    // Arrange

    // Act
    fixture.detectChanges();

    // Assert
    expect(component).toBeTruthy();
    expect(component.hasData).toBeFalse();
  });

  it('renders bars using the shortest categories and values length', () => {
    // Arrange
    component.categories = ['Jan', 'Feb', 'Mar'];
    component.values = [1200, 900];

    // Act
    fixture.detectChanges();

    // Assert
    const element = fixture.nativeElement as HTMLElement;
    const bars = element.querySelectorAll('.portal-hoteles-revenue-chart-card__bar-item');
    expect(bars.length).toBe(2);
    expect(component.chartPoints[0].category).toBe('Jan');
    expect(component.chartPoints[1].category).toBe('Feb');
  });

  it('normalizes invalid chart values to zero', () => {
    // Arrange
    component.categories = ['Jan', 'Feb', 'Mar'];
    component.values = [-100, 200, Number.NaN];

    // Act
    fixture.detectChanges();

    // Assert
    expect(component.chartPoints).toEqual([
      { category: 'Jan', value: 0 },
      { category: 'Feb', value: 200 },
      { category: 'Mar', value: 0 },
    ]);
  });

  it('shows empty fallback when chart input is empty', () => {
    // Arrange
    component.categories = [];
    component.values = [];

    // Act
    fixture.detectChanges();

    // Assert
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('No revenue data available.');
  });

  it('computes max scale when maxValue is not provided', () => {
    // Arrange
    component.categories = ['Jan', 'Feb'];
    component.values = [1000, 2000];

    // Act
    fixture.detectChanges();

    // Assert
    expect(component.resolvedMaxValue).toBe(2000);
    expect(component.getBarHeight(1000)).toBe(50);
  });

  it('uses explicit maxValue when it is a positive number', () => {
    // Arrange
    component.categories = ['Jan', 'Feb'];
    component.values = [200, 500];
    component.maxValue = 1000;

    // Act
    fixture.detectChanges();

    // Assert
    expect(component.resolvedMaxValue).toBe(1000);
    expect(component.getBarHeight(500)).toBe(50);
  });

  it('falls back to max value of 1 when data and maxValue are not positive', () => {
    // Arrange
    component.categories = ['Jan'];
    component.values = [0];
    component.maxValue = 0;

    // Act
    fixture.detectChanges();

    // Assert
    expect(component.resolvedMaxValue).toBe(1);
    expect(component.getBarHeight(0)).toBe(0);
  });

  it('uses explicit yAxisTicks sorted descending when valid ticks are provided', () => {
    // Arrange
    component.yAxisTicks = [0, 500, -10, 1000, Number.NaN, 250];

    // Act
    fixture.detectChanges();

    // Assert
    expect(component.resolvedTicks).toEqual([1000, 500, 250, 0]);
  });

  it('builds default y-axis ticks when explicit ticks are missing', () => {
    // Arrange
    component.categories = ['Jan', 'Feb'];
    component.values = [100, 200];
    component.yAxisTicks = [];

    // Act
    fixture.detectChanges();

    // Assert
    expect(component.resolvedTicks).toEqual([200, 150, 100, 50, 0]);
  });

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
  });

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

  it('formats bar aria labels using category and currency value', () => {
    // Arrange
    component.currencyPrefix = 'COP ';

    // Act
    const label = component.getBarAriaLabel({ category: 'Jan', value: 1234 });

    // Assert
    expect(label).toBe('Jan: COP 1,234');
  });

  it('tracks bars by category', () => {
    // Arrange
    const point = { category: 'Feb', value: 200 };

    // Act
    const trackId = component.trackByCategory(1, point);

    // Assert
    expect(trackId).toBe('Feb');
  });

  describe('a11y', () => {
    it('falls back to "Revenue overview chart" aria-label when ariaDescription is empty (AC-12)', () => {
      // Arrange
      component.categories = ['Jan', 'Feb'];
      component.values = [100, 200];
      component.ariaDescription = '';

      // Act
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      const chart = element.querySelector('.portal-hoteles-revenue-chart-card__chart');

      // Assert
      expect(chart).not.toBeNull();
      expect(chart?.getAttribute('aria-label')).toBe('Revenue overview chart');
    });

    it('marks each focusable bar with role="img" so SR announces the aria-label (AC-13)', () => {
      // Arrange
      component.categories = ['Jan', 'Feb', 'Mar'];
      component.values = [100, 200, 300];

      // Act
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      const bars = element.querySelectorAll('.portal-hoteles-revenue-chart-card__bar');

      // Assert
      expect(bars.length).toBe(3);
      bars.forEach((bar) => {
        expect(bar.getAttribute('role')).toBe('img');
        expect(bar.getAttribute('tabindex')).toBe('0');
        expect(bar.getAttribute('aria-label')).toMatch(/^[A-Za-z]+: /);
      });
    });
  });
});
