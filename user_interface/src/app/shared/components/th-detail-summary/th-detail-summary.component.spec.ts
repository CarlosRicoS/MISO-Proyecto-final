import { TestBed } from '@angular/core/testing';
import { ThDetailSummaryComponent } from './th-detail-summary.component';

describe('ThDetailSummaryComponent', () => {
  it('renders defaults', () => {
    TestBed.configureTestingModule({
      imports: [ThDetailSummaryComponent],
    });

    const fixture = TestBed.createComponent(ThDetailSummaryComponent);
    const component = fixture.componentInstance;

    expect(component.title).toBe('');
    expect(component.score).toBe('');
    expect(component.stars).toBe(5);
    expect(component.starIcons.length).toBe(5);
  });

  it('builds star icons from stars input', () => {
    TestBed.configureTestingModule({
      imports: [ThDetailSummaryComponent],
    });

    const fixture = TestBed.createComponent(ThDetailSummaryComponent);
    const component = fixture.componentInstance;

    component.stars = 3;

    expect(component.starIcons).toEqual(['star', 'star', 'star']);
  });

  it('returns false for booking metadata when both values are empty', () => {
    TestBed.configureTestingModule({
      imports: [ThDetailSummaryComponent],
    });

    const fixture = TestBed.createComponent(ThDetailSummaryComponent);
    const component = fixture.componentInstance;

    component.metaPrimary = '';
    component.metaSecondary = '';

    expect(component.hasBookingMeta).toBeFalse();
  });

  it('returns true for booking metadata when at least one value exists', () => {
    TestBed.configureTestingModule({
      imports: [ThDetailSummaryComponent],
    });

    const fixture = TestBed.createComponent(ThDetailSummaryComponent);
    const component = fixture.componentInstance;

    component.metaPrimary = 'Apr 26 - 29';
    component.metaSecondary = '';

    expect(component.hasBookingMeta).toBeTrue();
  });

  it('uses default status variant', () => {
    TestBed.configureTestingModule({
      imports: [ThDetailSummaryComponent],
    });

    const fixture = TestBed.createComponent(ThDetailSummaryComponent);
    const component = fixture.componentInstance;

    expect(component.statusVariant).toBe('default');
  });
});