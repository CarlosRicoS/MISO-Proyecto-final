import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ThHotelCardComponent } from './th-hotel-card.component';

describe('ThHotelCardComponent', () => {
  // ----- Accessibility: price spans wrapped with aria-hidden + sr-only (AC-17) -----

  it('default variant wraps price spans in a container with aria-hidden="true"', () => {
    TestBed.configureTestingModule({ imports: [ThHotelCardComponent, RouterTestingModule] });
    const fixture = TestBed.createComponent(ThHotelCardComponent);
    const component = fixture.componentInstance;
    component.variant = 'mobile';
    component.price = '120';
    component.pricePrefix = 'From ';
    component.priceSuffix = '/night';
    fixture.detectChanges();

    const footer: HTMLElement | null = fixture.nativeElement.querySelector('.th-hotel-card__footer');
    expect(footer).not.toBeNull();
    const hiddenSpan: HTMLElement | null = footer!.querySelector('span[aria-hidden="true"]');
    expect(hiddenSpan).not.toBeNull();
  });

  it('default variant has an adjacent .sr-only span with concatenated price text', () => {
    TestBed.configureTestingModule({ imports: [ThHotelCardComponent, RouterTestingModule] });
    const fixture = TestBed.createComponent(ThHotelCardComponent);
    const component = fixture.componentInstance;
    component.variant = 'mobile';
    component.price = '120';
    component.pricePrefix = 'From ';
    component.priceSuffix = '/night';
    fixture.detectChanges();

    const footer: HTMLElement | null = fixture.nativeElement.querySelector('.th-hotel-card__footer');
    const srOnly: HTMLElement | null = footer!.querySelector('.sr-only');
    expect(srOnly).not.toBeNull();
    expect(srOnly!.textContent).toContain('120');
  });

  it('booking variant wraps price spans in a container with aria-hidden="true"', () => {
    TestBed.configureTestingModule({ imports: [ThHotelCardComponent, RouterTestingModule] });
    const fixture = TestBed.createComponent(ThHotelCardComponent);
    const component = fixture.componentInstance;
    component.variant = 'booking';
    component.price = '300';
    component.pricePrefix = 'Total';
    component.priceSuffix = '';
    fixture.detectChanges();

    const bookingMeta: HTMLElement | null = fixture.nativeElement.querySelector('.th-hotel-card__booking-meta');
    expect(bookingMeta).not.toBeNull();
    const hiddenSpan: HTMLElement | null = bookingMeta!.querySelector('span[aria-hidden="true"]');
    expect(hiddenSpan).not.toBeNull();
  });

  it('booking variant has an adjacent .sr-only span with concatenated price text', () => {
    TestBed.configureTestingModule({ imports: [ThHotelCardComponent, RouterTestingModule] });
    const fixture = TestBed.createComponent(ThHotelCardComponent);
    const component = fixture.componentInstance;
    component.variant = 'booking';
    component.price = '300';
    component.pricePrefix = 'Total';
    component.priceSuffix = '';
    fixture.detectChanges();

    const bookingMeta: HTMLElement | null = fixture.nativeElement.querySelector('.th-hotel-card__booking-meta');
    const srOnly: HTMLElement | null = bookingMeta!.querySelector('.sr-only');
    expect(srOnly).not.toBeNull();
    expect(srOnly!.textContent).toContain('300');
  });

  it('creates with defaults', () => {
    TestBed.configureTestingModule({
      imports: [ThHotelCardComponent, RouterTestingModule],
    });

    const fixture = TestBed.createComponent(ThHotelCardComponent);
    const component = fixture.componentInstance;

    expect(component.variant).toBe('mobile');
    expect(component.showFavorite).toBeTrue();
    expect(component.imageUrl).toBe('');
  });

  it('normalizes imageUrl when provided as a list', () => {
    TestBed.configureTestingModule({
      imports: [ThHotelCardComponent, RouterTestingModule],
    });

    const fixture = TestBed.createComponent(ThHotelCardComponent);
    const component = fixture.componentInstance;

    component.imageUrl = ['', '  ', 'https://img.example.com/hotel.jpg'];

    expect(component.imageUrl).toBe('https://img.example.com/hotel.jpg');
  });

  it('normalizes whitespace-only string imageUrl to empty', () => {
    TestBed.configureTestingModule({
      imports: [ThHotelCardComponent, RouterTestingModule],
    });

    const fixture = TestBed.createComponent(ThHotelCardComponent);
    const component = fixture.componentInstance;

    component.imageUrl = '   ';

    expect(component.imageUrl).toBe('');
  });
});
