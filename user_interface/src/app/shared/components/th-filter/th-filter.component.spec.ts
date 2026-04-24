import { TestBed } from '@angular/core/testing';
import { ThFilterComponent } from './th-filter.component';

describe('ThFilterComponent', () => {
  // ----- Accessibility: ARIA label associations (AC-9) -----

  it('location span has id="th-filter-location-label"', () => {
    TestBed.configureTestingModule({ imports: [ThFilterComponent] });
    const fixture = TestBed.createComponent(ThFilterComponent);
    fixture.detectChanges();

    const spans: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('span.th-filter__label');
    const locationSpan = Array.from(spans).find((s) => s.id === 'th-filter-location-label');
    expect(locationSpan).not.toBeUndefined();
  });

  it('location ion-input has aria-labelledby="th-filter-location-label"', () => {
    TestBed.configureTestingModule({ imports: [ThFilterComponent] });
    const fixture = TestBed.createComponent(ThFilterComponent);
    fixture.detectChanges();

    const inputs: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('ion-input');
    const locationInput = inputs[0];
    expect(locationInput.getAttribute('aria-labelledby')).toBe('th-filter-location-label');
  });

  it('guests span has id="th-filter-guests-label"', () => {
    TestBed.configureTestingModule({ imports: [ThFilterComponent] });
    const fixture = TestBed.createComponent(ThFilterComponent);
    fixture.detectChanges();

    const spans: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('span.th-filter__label');
    const guestsSpan = Array.from(spans).find((s) => s.id === 'th-filter-guests-label');
    expect(guestsSpan).not.toBeUndefined();
  });

  it('guests ion-input has aria-labelledby="th-filter-guests-label"', () => {
    TestBed.configureTestingModule({ imports: [ThFilterComponent] });
    const fixture = TestBed.createComponent(ThFilterComponent);
    fixture.detectChanges();

    const inputs: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('ion-input');
    const guestsInput = inputs[1];
    expect(guestsInput.getAttribute('aria-labelledby')).toBe('th-filter-guests-label');
  });

  it('all decorative ion-icon elements have aria-hidden="true"', () => {
    TestBed.configureTestingModule({ imports: [ThFilterComponent] });
    const fixture = TestBed.createComponent(ThFilterComponent);
    fixture.detectChanges();

    const icons: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('ion-icon');
    expect(icons.length).toBeGreaterThan(0);
    icons.forEach((icon) => {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('sanitizes guests input to digits only', () => {
    TestBed.configureTestingModule({
      imports: [ThFilterComponent],
    });

    const fixture = TestBed.createComponent(ThFilterComponent);
    const component = fixture.componentInstance;
    const spy = spyOn(component.guestsValueChange, 'emit');

    component.onGuestsInput('2 guests');

    expect(spy).toHaveBeenCalledWith('2');
  });

  it('handles null guests input', () => {
    TestBed.configureTestingModule({
      imports: [ThFilterComponent],
    });

    const fixture = TestBed.createComponent(ThFilterComponent);
    const component = fixture.componentInstance;
    const spy = spyOn(component.guestsValueChange, 'emit');

    component.onGuestsInput(null);

    expect(spy).toHaveBeenCalledWith('');
  });

  it('handles undefined guests input', () => {
    TestBed.configureTestingModule({
      imports: [ThFilterComponent],
    });

    const fixture = TestBed.createComponent(ThFilterComponent);
    const component = fixture.componentInstance;
    const spy = spyOn(component.guestsValueChange, 'emit');

    component.onGuestsInput(undefined);

    expect(spy).toHaveBeenCalledWith('');
  });
});
