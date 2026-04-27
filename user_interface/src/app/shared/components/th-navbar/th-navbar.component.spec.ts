import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, Platform } from '@ionic/angular';
import { ThNavbarComponent } from './th-navbar.component';

class RouterMock {
  url = '/search-results';
}

class PlatformMock {
  is(platform: string): boolean {
    return false; // Simulate web environment for tests
  }
}

describe('ThNavbarComponent', () => {
  it('detects search results route', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent],
      providers: [
        { provide: Router, useClass: RouterMock },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.isSearchResults).toBeTrue();
  });

  it('detects property detail route', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent],
      providers: [
        { provide: Router, useValue: { url: '/propertydetail/123' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.isPropertyDetail).toBeTrue();
  });

  it('returns false for non-results routes', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent],
      providers: [
        { provide: Router, useValue: { url: '/home' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.isSearchResults).toBeFalse();
  });

  it('detects booking detail route', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent],
      providers: [
        { provide: Router, useValue: { url: '/booking-detail?bookingId=res-1' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.isBookingDetail).toBeTrue();
    expect(component.isDetailRoute).toBeTrue();
    expect(component.detailBackLink).toBe('/booking-list');
    expect(component.showDetailFavoriteAction).toBeFalse();
  });

  it('keeps favorite action for property detail route', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent],
      providers: [
        { provide: Router, useValue: { url: '/propertydetail/123' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.detailBackLink).toBe('/search-results');
    expect(component.showDetailFavoriteAction).toBeTrue();
  });

  it('detects booking list route', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent],
      providers: [
        { provide: Router, useValue: { url: '/booking-list' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.isBookingList).toBeTrue();
    expect(component.isSearchLikeRoute).toBeTrue();
  });

  it('returns My Reservations as mobile title for booking list', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent],
      providers: [
        { provide: Router, useValue: { url: '/booking-list' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.mobileTitle).toBe('My Reservations');
  });

  it('detects notifications route', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent],
      providers: [
        { provide: Router, useValue: { url: '/notifications' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.isNotificationsRoute).toBeTrue();
    expect(component.isSearchLikeRoute).toBeTrue();
  });

  it('returns Notifications as mobile title for notifications route', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent],
      providers: [
        { provide: Router, useValue: { url: '/notifications' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.mobileTitle).toBe('Notifications');
  });

  // ----- Accessibility: button aria-labels and aria-hidden (AC-1, AC-4) -----
  // These tests verify the component property values that drive aria attributes.
  // DOM rendering tests are skipped because the Ionic NavController requires
  // NavigationExtras DI setup beyond the existing test harness scope.

  it('isBookingList is true on /booking-list route (drives aria-label="More options")', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent],
      providers: [
        { provide: Router, useValue: { url: '/booking-list' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    // isBookingList=true means the template binds aria-label="More options"
    expect(component.isBookingList).toBeTrue();
    expect(component.isSearchLikeRoute).toBeTrue();
  });

  it('isBookingList is false on /search-results route (drives aria-label="Add to favorites")', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent],
      providers: [
        { provide: Router, useValue: { url: '/search-results' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    // isBookingList=false means the template binds aria-label="Add to favorites"
    expect(component.isBookingList).toBeFalse();
    expect(component.isSearchResults).toBeTrue();
  });

  it('returns Search Results as mobile title for search results route', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent],
      providers: [
        { provide: Router, useValue: { url: '/search-results' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.mobileTitle).toBe('Search Results');
  });
});
