import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { of, Subject } from 'rxjs';

import { AppComponent } from './app.component';
import { AuthSessionService } from './core/services/auth-session.service';
import { CurrencyConversionService } from './core/services/currency-conversion.service';
import { ConnectivityService } from './core/services/connectivity.service';
import { NotificationService } from './core/services/notification.service';

class AuthSessionServiceMock {
  isLoggedIn = false;
  state$ = of({ loggedIn: false, loginResponse: null });
}

class CurrencyConversionServiceMock {
  ensureRatesLoaded = jasmine.createSpy('ensureRatesLoaded').and.resolveTo();
}

class ConnectivityServiceMock {
  shouldShowMobileBanner = false;
}

class NotificationServiceMock {
  initialize = jasmine.createSpy('initialize').and.returnValue(Promise.resolve());
  teardown = jasmine.createSpy('teardown').and.returnValue(Promise.resolve());
  clearNotifications = jasmine.createSpy('clearNotifications');
}

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: any;
  let routerMock: any;
  let activatedRouteMock: any;
  let authSessionServiceMock: AuthSessionServiceMock;
  let currencyConversionServiceMock: CurrencyConversionServiceMock;
  let connectivityServiceMock: ConnectivityServiceMock;
  let notificationServiceMock: NotificationServiceMock;
  let routerEventsSubject: Subject<any>;

  beforeEach(async () => {
    routerEventsSubject = new Subject<any>();

    activatedRouteMock = {
      snapshot: { data: {} },
      firstChild: null,
      pathFromRoot: [
        {
          snapshot: { data: {} },
        },
      ],
    } as unknown as ActivatedRoute;

    routerMock = {
      events: routerEventsSubject.asObservable(),
      url: '/',
      navigate: jasmine.createSpy('navigate').and.resolveTo(true),
    } as Partial<Router>;

    authSessionServiceMock = new AuthSessionServiceMock();
    currencyConversionServiceMock = new CurrencyConversionServiceMock();
    connectivityServiceMock = new ConnectivityServiceMock();
    notificationServiceMock = new NotificationServiceMock();

    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: Router, useValue: routerMock },
        { provide: AuthSessionService, useValue: authSessionServiceMock },
        { provide: CurrencyConversionService, useValue: currencyConversionServiceMock },
        { provide: ConnectivityService, useValue: connectivityServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should return true for isPropertyDetailRoute when on property detail page', () => {
    routerMock.url = '/propertydetail';
    expect(component.isPropertyDetailRoute).toBe(true);
  });

  it('should return true for isPropertyDetailRoute when URL starts with /propertydetail', () => {
    routerMock.url = '/propertydetail/123';
    expect(component.isPropertyDetailRoute).toBe(true);
  });

  it('should return false for isPropertyDetailRoute when not on property detail page', () => {
    routerMock.url = '/home';
    expect(component.isPropertyDetailRoute).toBe(false);
  });

  it('should return false for isPropertyDetailRoute when on search results page', () => {
    routerMock.url = '/search-results';
    expect(component.isPropertyDetailRoute).toBe(false);
  });

  it('should return false for isPropertyDetailRoute when on login page', () => {
    routerMock.url = '/login';
    expect(component.isPropertyDetailRoute).toBe(false);
  });

  it('should return true for isNotificationsRoute when on notifications page', () => {
    routerMock.url = '/notifications';
    expect(component.isNotificationsRoute).toBe(true);
  });

  it('should show mobile top bar on notifications route', () => {
    routerMock.url = '/notifications';
    expect(component.showMobileTopBar).toBeTrue();
  });

  it('should expose auth mode when the session is logged out', () => {
    expect(component.navbarMode).toBe('auth');
  });

  it('should hide the offline banner by default', () => {
    expect(component.showOfflineBanner).toBeFalse();
  });

  it('should show the offline banner when connectivity is unavailable on mobile', () => {
    connectivityServiceMock.shouldShowMobileBanner = true;

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.showOfflineBanner).toBeTrue();
  });

  it('should return full navbar mode when session is logged in', () => {
    authSessionServiceMock.isLoggedIn = true;
    authSessionServiceMock.state$ = of({ loggedIn: true, loginResponse: null });

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.navbarMode).toBe('full');
    expect(currencyConversionServiceMock.ensureRatesLoaded).toHaveBeenCalled();
  });

  it('should treat login pages as hidden navbar routes', () => {
    activatedRouteMock.pathFromRoot[0].snapshot.data = { hideNavbar: true };
    routerMock.url = '/login';

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.hasTopBar).toBeFalse();
  });

  // ----- isBookingDetailRoute -----
  it('should return true for isBookingDetailRoute when on booking detail page', () => {
    routerMock.url = '/booking-detail';
    expect(component.isBookingDetailRoute).toBeTrue();
  });

  it('should return true for isBookingDetailRoute when URL includes parameters', () => {
    routerMock.url = '/booking-detail?bookingId=res-123';
    expect(component.isBookingDetailRoute).toBeTrue();
  });

  it('should return false for isBookingDetailRoute when not on booking detail page', () => {
    routerMock.url = '/search-results';
    expect(component.isBookingDetailRoute).toBeFalse();
  });

  // ----- isDetailRoute composite getter -----
  it('should return true for isDetailRoute when on property detail', () => {
    routerMock.url = '/propertydetail/789';
    expect(component.isDetailRoute).toBeTrue();
  });

  it('should return true for isDetailRoute when on booking detail', () => {
    routerMock.url = '/booking-detail?id=123';
    expect(component.isDetailRoute).toBeTrue();
  });

  it('should return false for isDetailRoute when on search results', () => {
    routerMock.url = '/search-results';
    expect(component.isDetailRoute).toBeFalse();
  });

  // ----- isSearchResultsRoute -----
  it('should return true for isSearchResultsRoute when on search results', () => {
    routerMock.url = '/search-results';
    expect(component.isSearchResultsRoute).toBeTrue();
  });

  it('should return false for isSearchResultsRoute on other routes', () => {
    routerMock.url = '/booking-list';
    expect(component.isSearchResultsRoute).toBeFalse();
  });

  // ----- isBookingListRoute -----
  it('should return true for isBookingListRoute when on booking list', () => {
    routerMock.url = '/booking-list';
    expect(component.isBookingListRoute).toBeTrue();
  });

  it('should return false for isBookingListRoute on other routes', () => {
    routerMock.url = '/search-results';
    expect(component.isBookingListRoute).toBeFalse();
  });

  // ----- showMobileTopBar with different routes -----
  it('should show mobile top bar on search results route', () => {
    routerMock.url = '/search-results';
    expect(component.showMobileTopBar).toBeTrue();
  });

  it('should show mobile top bar on booking list route', () => {
    routerMock.url = '/booking-list';
    expect(component.showMobileTopBar).toBeTrue();
  });

  it('should show mobile top bar on property detail route', () => {
    routerMock.url = '/propertydetail/123';
    expect(component.showMobileTopBar).toBeTrue();
  });

  it('should show mobile top bar on booking detail route', () => {
    routerMock.url = '/booking-detail?id=res-1';
    expect(component.showMobileTopBar).toBeTrue();
  });

  it('should show mobile top bar when showNavbar is true', () => {
    component.showNavbar = true;
    expect(component.showMobileTopBar).toBeTrue();
  });

  // ----- hasTopBar with different combinations -----
  it('should have top bar when showNavbar is true', () => {
    component.showNavbar = true;
    component.isMobileLayout = false;
    expect(component.hasTopBar).toBeTrue();
  });

  it('should have top bar when mobile layout and on search results route', () => {
    routerMock.url = '/search-results';
    component.isMobileLayout = true;
    component.showNavbar = false;
    expect(component.hasTopBar).toBeTrue();
  });

  it('should not have top bar when not on mobile and showNavbar is false', () => {
    routerMock.url = '/unknown';
    component.isMobileLayout = false;
    component.showNavbar = false;
    expect(component.hasTopBar).toBeFalse();
  });

  // ----- onProfileTabClick with logged-in branch -----
  it('should not navigate when profile tab is clicked and user is logged in', () => {
    authSessionServiceMock.isLoggedIn = true;

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.onProfileTabClick();

    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('should navigate to login when profile tab is clicked and user is not logged in', () => {
    component.onProfileTabClick();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
  });

  // ----- Auth state subscription -----
  it('should clear notifications when user logs in', (done) => {
    const stateSubject = new Subject<{ loggedIn: boolean; loginResponse: any }>();
    authSessionServiceMock.state$ = stateSubject.asObservable();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Emit logged in state
    stateSubject.next({ loggedIn: true, loginResponse: null });

    setTimeout(() => {
      expect(notificationServiceMock.clearNotifications).toHaveBeenCalled();
      done();
    }, 100);
  });

  it('should update navbar mode when auth state changes', (done) => {
    const stateSubject = new Subject<{ loggedIn: boolean; loginResponse: any }>();
    authSessionServiceMock.state$ = stateSubject.asObservable();
    authSessionServiceMock.isLoggedIn = false;

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.navbarMode).toBe('auth');

    stateSubject.next({ loggedIn: true, loginResponse: null });

    setTimeout(() => {
      expect(component.navbarMode).toBe('full');
      done();
    }, 100);
  });

  // ----- Router events and layout updates -----
  it('should update navbar visibility on navigation', (done) => {
    component.showNavbar = true;

    // Simulate navigation to a route with hideNavbar
    activatedRouteMock.pathFromRoot[0].snapshot.data = { hideNavbar: true };
    routerEventsSubject.next(new NavigationEnd(1, '/login', '/login'));

    setTimeout(() => {
      expect(component.showNavbar).toBeFalse();
      done();
    }, 50);
  });

  it('should update layout on navigation', (done) => {
    const initialLayout = component.isMobileLayout;

    routerEventsSubject.next(new NavigationEnd(1, '/search-results', '/search-results'));

    setTimeout(() => {
      // Layout should still be false since default window width is larger than breakpoint
      expect(component.isMobileLayout).toBe(initialLayout);
      done();
    }, 50);
  });

  // ----- Notification service lifecycle -----
  it('should initialize notification service on init', () => {
    expect(notificationServiceMock.initialize).toHaveBeenCalled();
  });

  it('should teardown notification service on destroy', () => {
    component.ngOnDestroy();
    expect(notificationServiceMock.teardown).toHaveBeenCalled();
  });

  it('should unsubscribe from router events on destroy', () => {
    const routerEventsSub = component['routerEventsSub'];
    if (routerEventsSub) {
      spyOn(routerEventsSub, 'unsubscribe');

      component.ngOnDestroy();

      expect(routerEventsSub.unsubscribe).toHaveBeenCalled();
    }
  });

  it('should unsubscribe from auth state on destroy', () => {
    const authStateSub = component['authStateSub'];
    if (authStateSub) {
      spyOn(authStateSub, 'unsubscribe');

      component.ngOnDestroy();

      expect(authStateSub.unsubscribe).toHaveBeenCalled();
    }
  });

  // ----- Platform class management -----
  it('should apply platform classes on init', () => {
    spyOn(document.body.classList, 'toggle');

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(document.body.classList.toggle).toHaveBeenCalled();
  });

  it('should clear platform classes on destroy', () => {
    spyOn(document.body.classList, 'remove');

    component.ngOnDestroy();

    expect(document.body.classList.remove).toHaveBeenCalledWith('app-platform-native', 'app-platform-web');
  });

  // ----- getDeepestChild helper -----
  it('should get the deepest child route', () => {
    const deepChild = { snapshot: { data: {} }, firstChild: null } as any;
    const parentRoute = {
      snapshot: { data: {} },
      firstChild: deepChild,
    } as any;

    const result = (component as any).getDeepestChild(parentRoute);

    expect(result).toBe(deepChild);
  });

  it('should return current route when no children', () => {
    const route = {
      snapshot: { data: {} },
      firstChild: null,
    } as any;

    const result = (component as any).getDeepestChild(route);

    expect(result).toBe(route);
  });

  // ----- updateLayout with different window sizes -----
  it('should set isMobileLayout based on window.innerWidth fallback', () => {
    // Delete matchMedia to simulate environment without it
    const originalMatchMedia = window.matchMedia;
    delete (window as any).matchMedia;

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;

    (component as any).updateLayout();

    expect(component.isMobileLayout).toBe(window.innerWidth <= 720);

    // Restore matchMedia
    (window as any).matchMedia = originalMatchMedia;
  });

});
