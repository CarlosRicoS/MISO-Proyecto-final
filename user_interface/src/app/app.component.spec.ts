import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { AppComponent } from './app.component';
import { AuthSessionService } from './core/services/auth-session.service';

class AuthSessionServiceMock {
  isLoggedIn = false;
  state$ = of({ loggedIn: false, loginResponse: null });
}

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: any;
  let routerMock: any;
  let activatedRouteMock: any;
  let authSessionServiceMock: AuthSessionServiceMock;

  beforeEach(async () => {
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
      events: of(),
      url: '/',
    } as Partial<Router>;

    authSessionServiceMock = new AuthSessionServiceMock();

    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: Router, useValue: routerMock },
        { provide: AuthSessionService, useValue: authSessionServiceMock },
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

  it('should return full navbar mode when session is logged in', () => {
    authSessionServiceMock.isLoggedIn = true;
    authSessionServiceMock.state$ = of({ loggedIn: true, loginResponse: null });

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.navbarMode).toBe('full');
  });

  it('should treat login pages as hidden navbar routes', () => {
    activatedRouteMock.pathFromRoot[0].snapshot.data = { hideNavbar: true };
    routerMock.url = '/login';

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.hasTopBar).toBeFalse();
  });

});
