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
});
