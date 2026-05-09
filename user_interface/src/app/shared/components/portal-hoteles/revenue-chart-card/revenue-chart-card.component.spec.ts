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
    expect(chart?.getAttribute('role')).toBe('img');
    expect(chart?.getAttribute('tabindex')).toBe('0');
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

});
