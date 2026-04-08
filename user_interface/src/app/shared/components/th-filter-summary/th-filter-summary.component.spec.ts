import { TestBed } from '@angular/core/testing';
import { ThFilterSummaryComponent } from './th-filter-summary.component';

describe('ThFilterSummaryComponent', () => {
  let component: ThFilterSummaryComponent;
  let fixture: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ThFilterSummaryComponent],
    });

    fixture = TestBed.createComponent(ThFilterSummaryComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses custom alt text when provided', () => {
    component.alt = 'Custom summary';
    expect(component.resolvedAlt).toBe('Custom summary');
  });

  it('uses default alt text initially', () => {
    expect(component.alt).toBe('Filter summary');
    expect(component.resolvedAlt).toBe('Filter summary');
  });

  it('builds alt text from filter params', () => {
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
    expect(component.resolvedAlt).toContain('City: Paris');
  });

  it('uses default alt when params are null', () => {
    component.filterParams = null;
    expect(component.resolvedAlt).toBe('Filter summary');
  });

  it('fills in default labels and values when missing', () => {
    component.filterParams = {};

    expect(component.resolvedAlt).toContain('Destination: -');
    expect(component.resolvedAlt).toContain('Check-in: -');
    expect(component.resolvedAlt).toContain('Check-out: -');
    expect(component.resolvedAlt).toContain('Guests: -');
  });

  it('uses fallback values for missing optional fields', () => {
    component.filterParams = {
      locationValue: 'London',
      guestsValue: '3',
    };

    const alt = component.resolvedAlt;
    expect(alt).toContain('Destination: London');
    expect(alt).toContain('Guests: 3');
    expect(alt).toContain('Check-in: -');
    expect(alt).toContain('Check-out: -');
  });

  it('prioritizes custom alt over filter params', () => {
    component.alt = 'My Custom Summary';
    component.filterParams = {
      locationValue: 'Paris',
    };

    expect(component.resolvedAlt).toBe('My Custom Summary');
  });
});
