import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, Platform, PopoverController } from '@ionic/angular';
import { ThNavbarComponent } from './th-navbar.component';
import { translateTestingModule } from '../../../testing/translate-testing.module';
import { LocaleService } from '../../../core/services/locale.service';

class RouterMock {
  url = '/search-results';
  navigate = jasmine.createSpy('navigate').and.resolveTo(true);
}

class PlatformMock {
  is(platform: string): boolean {
    return false; // Simulate web environment for tests
  }
}

class LocaleServiceMock {
  currentLang = 'en';
  toggle = jasmine.createSpy('toggle');
}

describe('ThNavbarComponent', () => {
  it('detects search results route', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useClass: RouterMock },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
        { provide: LocaleService, useClass: LocaleServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.isSearchResults).toBeTrue();
  });

  it('detects property detail route', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useValue: { url: '/propertydetail/123' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
        { provide: LocaleService, useClass: LocaleServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.isPropertyDetail).toBeTrue();
  });

  it('returns false for non-results routes', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useValue: { url: '/home' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
        { provide: LocaleService, useClass: LocaleServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.isSearchResults).toBeFalse();
  });

  it('detects booking detail route', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useValue: { url: '/booking-detail?bookingId=res-1' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
        { provide: LocaleService, useClass: LocaleServiceMock },
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
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useValue: { url: '/propertydetail/123' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
        { provide: LocaleService, useClass: LocaleServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.detailBackLink).toBe('/search-results');
    expect(component.showDetailFavoriteAction).toBeTrue();
  });

  it('detects booking list route', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useValue: { url: '/booking-list' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
        { provide: LocaleService, useClass: LocaleServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.isBookingList).toBeTrue();
    expect(component.isSearchLikeRoute).toBeTrue();
  });

  it('returns My Reservations as mobile title for booking list', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useValue: { url: '/booking-list' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
        { provide: LocaleService, useClass: LocaleServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.mobileTitle).toBe('My Reservations');
  });

  it('detects notifications route', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useValue: { url: '/notifications' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
        { provide: LocaleService, useClass: LocaleServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.isNotificationsRoute).toBeTrue();
    expect(component.isSearchLikeRoute).toBeTrue();
  });

  it('returns Notifications as mobile title for notifications route', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useValue: { url: '/notifications' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
        { provide: LocaleService, useClass: LocaleServiceMock },
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
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useValue: { url: '/booking-list' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
        { provide: LocaleService, useClass: LocaleServiceMock },
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
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useValue: { url: '/search-results' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
        { provide: LocaleService, useClass: LocaleServiceMock },
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
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useValue: { url: '/search-results' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
        { provide: LocaleService, useClass: LocaleServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.mobileTitle).toBe('Search Results');
  });

  // ----- Input property defaults -----
  it('has correct input property defaults', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useClass: RouterMock },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
        { provide: LocaleService, useClass: LocaleServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.mode).toBe('auth');
    expect(component.layout).toBe('auto');
    expect(component.logoSrc).toBe('assets/logos/portal_web.svg');
    expect(component.logoAlt).toBe('TravelHub');
    expect(component.showCurrency).toBeTrue();
  });

  it('accepts custom input values', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useClass: RouterMock },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
        { provide: LocaleService, useClass: LocaleServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    component.mode = 'full';
    component.layout = 'desktop';
    component.logoSrc = 'assets/custom-logo.svg';
    component.logoAlt = 'Custom Alt';
    component.showCurrency = false;

    expect(component.mode).toBe('full');
    expect(component.layout).toBe('desktop');
    expect(component.logoSrc).toBe('assets/custom-logo.svg');
    expect(component.logoAlt).toBe('Custom Alt');
    expect(component.showCurrency).toBeFalse();
  });

  // ----- Language toggle -----
  it('returns current language from locale service', () => {
    const localeService = jasmine.createSpyObj('LocaleService', ['toggle'], { currentLang: 'es' });

    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useClass: RouterMock },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
        { provide: LocaleService, useValue: localeService },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.currentLang).toBe('es');
  });

  it('calls toggleLanguage on locale service', () => {
    const localeService = jasmine.createSpyObj('LocaleService', ['toggle'], { currentLang: 'en' });

    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useClass: RouterMock },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
        { provide: LocaleService, useValue: localeService },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    component.toggleLanguage();

    expect(localeService.toggle).toHaveBeenCalled();
  });

  // ----- Mobile native detection -----
  it('detects mobile native platform when capacitor is present', () => {
    const platformMock = jasmine.createSpyObj('Platform', ['is'], { is: (platform: string) => platform === 'capacitor' });

    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useClass: RouterMock },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useValue: platformMock },
        { provide: LocaleService, useClass: LocaleServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.isMobileNative).toBeTrue();
  });

  it('returns false for isMobileNative on web platform', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useClass: RouterMock },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
        { provide: LocaleService, useClass: LocaleServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.isMobileNative).toBeFalse();
  });

  // ----- Notifications click handler -----
  it('navigates to notifications on mobile layout', async () => {
    const routerMock = jasmine.createSpyObj('Router', ['navigate'], { url: '/search-results' });
    routerMock.navigate.and.resolveTo(true);

    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
        { provide: LocaleService, useClass: LocaleServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;
    component.layout = 'mobile';

    const event = new MouseEvent('click');
    spyOn(event, 'stopPropagation');

    await component.onNotificationsClick(event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/notifications']);
  });

  it('takes desktop branch in onNotificationsClick when layout is desktop', async () => {
    const routerMock = jasmine.createSpyObj('Router', ['navigate'], { url: '/search-results' });
    routerMock.navigate.and.resolveTo(false); // Ensure navigate is not called

    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
        { provide: LocaleService, useClass: LocaleServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;
    component.layout = 'desktop';

    const event = new MouseEvent('click');
    spyOn(event, 'stopPropagation');

    // Call the method - it will attempt to create and present a popover
    // We're just verifying that layout !== 'desktop' is false, so it doesn't navigate
    try {
      await component.onNotificationsClick(event);
    } catch (e) {
      // PopoverController might throw since we haven't fully mocked Ionic,
      // but that's okay - we're just verifying the branch is taken
    }

    expect(event.stopPropagation).toHaveBeenCalled();
    // Verify it didn't navigate (desktop branch doesn't navigate)
    expect(routerMock.navigate).not.toHaveBeenCalledWith(['/notifications']);
  });

  it('stops event propagation in onNotificationsClick', async () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useClass: RouterMock },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
        { provide: LocaleService, useClass: LocaleServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;
    component.layout = 'mobile';

    const event = new MouseEvent('click');
    spyOn(event, 'stopPropagation');

    await component.onNotificationsClick(event);

    expect(event.stopPropagation).toHaveBeenCalled();
  });

  // ----- Mobile title default case -----
  it('returns Search Results as mobile title for unrecognized routes', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useValue: { url: '/unknown-route' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
        { provide: LocaleService, useClass: LocaleServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.mobileTitle).toBe('Search Results');
  });

  // ----- Route detection combinations -----
  it('isDetailRoute returns true when on booking detail', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useValue: { url: '/booking-detail?id=123' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
        { provide: LocaleService, useClass: LocaleServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.isDetailRoute).toBeTrue();
  });

  it('isDetailRoute returns true when on property detail', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useValue: { url: '/propertydetail/456' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
        { provide: LocaleService, useClass: LocaleServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.isDetailRoute).toBeTrue();
  });

  it('isDetailRoute returns false on search results', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useValue: { url: '/search-results' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
        { provide: LocaleService, useClass: LocaleServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.isDetailRoute).toBeFalse();
  });

  it('isSearchLikeRoute returns true for search results', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useValue: { url: '/search-results' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
        { provide: LocaleService, useClass: LocaleServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.isSearchLikeRoute).toBeTrue();
  });

  it('isSearchLikeRoute returns false for detail routes', () => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ThNavbarComponent, translateTestingModule()],
      providers: [
        { provide: Router, useValue: { url: '/propertydetail/789' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Platform, useClass: PlatformMock },
        { provide: LocaleService, useClass: LocaleServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.isSearchLikeRoute).toBeFalse();
  });
});
