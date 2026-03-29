import { TestBed } from '@angular/core/testing';
import { ThFilterSummaryComponent } from './th-filter-summary.component';

describe('ThFilterSummaryComponent', () => {
  it('uses custom alt text when provided', () => {
    TestBed.configureTestingModule({
      imports: [ThFilterSummaryComponent],
    });

    const fixture = TestBed.createComponent(ThFilterSummaryComponent);
    const component = fixture.componentInstance;

    component.alt = 'Custom summary';

    expect(component.resolvedAlt).toBe('Custom summary');
  });

  it('builds alt text from filter params', () => {
    TestBed.configureTestingModule({
      imports: [ThFilterSummaryComponent],
    });

    const fixture = TestBed.createComponent(ThFilterSummaryComponent);
    const component = fixture.componentInstance;

    component.filterParams = {
      locationLabel: 'City',
      locationValue: 'Paris',
      checkInLabel: 'Check-in',
      checkInValue: '01/03/2026',
      checkOutLabel: 'Check-out',
      checkOutValue: '02/03/2026',
      guestsLabel: 'Guests',
      guestsValue: '2 Guests',
    };

    expect(component.resolvedAlt).toContain('Paris');
    expect(component.resolvedAlt).toContain('2 Guests');
  });

  it('uses default alt when params are missing', () => {
    TestBed.configureTestingModule({
      imports: [ThFilterSummaryComponent],
    });

    const fixture = TestBed.createComponent(ThFilterSummaryComponent);
    const component = fixture.componentInstance;

    component.filterParams = null;

    expect(component.resolvedAlt).toBe('Filter summary');
  });

  it('fills in default labels and values when missing', () => {
    TestBed.configureTestingModule({
      imports: [ThFilterSummaryComponent],
    });

    const fixture = TestBed.createComponent(ThFilterSummaryComponent);
    const component = fixture.componentInstance;

    component.filterParams = {};

    expect(component.resolvedAlt).toContain('Destination: -');
    expect(component.resolvedAlt).toContain('Check-in: -');
    expect(component.resolvedAlt).toContain('Check-out: -');
    expect(component.resolvedAlt).toContain('Guests: -');
  });
});
