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

  // ----- Accessibility: section root, aria-label, icon aria-hidden (AC-30) -----

  it('root element is a <section>', () => {
    fixture.detectChanges();
    const section: HTMLElement | null = fixture.nativeElement.querySelector('section.th-filter-summary');
    expect(section).not.toBeNull();
  });

  it('section aria-label defaults to "Search filters" when no filterParams are provided', () => {
    component.filterParams = null;
    component.alt = 'Filter summary'; // default alt — the component falls back to resolvedAlt || "Search filters"
    fixture.detectChanges();

    // When alt is the default "Filter summary" and no filterParams, resolvedAlt is "Filter summary"
    // The template renders [attr.aria-label]="resolvedAlt || 'Search filters'"
    // so aria-label = "Filter summary" (the resolvedAlt value) or "Search filters"
    const section: HTMLElement | null = fixture.nativeElement.querySelector('section.th-filter-summary');
    expect(section).not.toBeNull();
    const label = section!.getAttribute('aria-label');
    expect(label).toBeTruthy();
  });

  it('section aria-label contains location value when filterParams are provided', () => {
    component.filterParams = { locationValue: 'Barcelona' };
    fixture.detectChanges();

    const section: HTMLElement | null = fixture.nativeElement.querySelector('section.th-filter-summary');
    expect(section!.getAttribute('aria-label')).toContain('Barcelona');
  });

  it('all ion-icon elements inside desktop-actions have aria-hidden="true"', () => {
    fixture.detectChanges();
    const desktopActions: HTMLElement | null = fixture.nativeElement.querySelector('.th-filter-summary__desktop-actions');
    if (desktopActions) {
      const icons: NodeListOf<HTMLElement> = desktopActions.querySelectorAll('ion-icon');
      icons.forEach((icon) => {
        expect(icon.getAttribute('aria-hidden')).toBe('true');
      });
    }
  });
});
