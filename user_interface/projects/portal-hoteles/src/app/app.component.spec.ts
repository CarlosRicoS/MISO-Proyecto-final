import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Subject } from 'rxjs';
import { AuthSessionService } from '@travelhub/core/services/auth-session.service';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let routerEvents$: Subject<unknown>;

  const routerMock = {
    events: new Subject<unknown>(),
    navigate: jasmine.createSpy('navigate'),
  };

  const authSessionMock = jasmine.createSpyObj<AuthSessionService>('AuthSessionService', ['clearSession']);

  const activatedRouteMock: any = {
    snapshot: { data: {} },
    firstChild: null,
    pathFromRoot: [{ snapshot: { data: {} } }],
  };

  beforeEach(waitForAsync(() => {
    routerEvents$ = new Subject<unknown>();
    routerMock.events = routerEvents$;

    TestBed.configureTestingModule({
      declarations: [ AppComponent ],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: AuthSessionService, useValue: authSessionMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: Router, useValue: routerMock },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    // Arrange

    // Act
    const instance = component;

    // Assert
    expect(instance).toBeTruthy();
  });

  it('hides navbar when any route in the chain sets hideNavbar=true', () => {
    // Arrange
    activatedRouteMock.pathFromRoot = [
      { snapshot: { data: {} } },
      { snapshot: { data: { hideNavbar: true } } },
    ];

    // Act
    component.ngOnInit();

    // Assert
    expect(component.showNavbar).toBeFalse();
  });

  it('shows navbar when route chain does not request hiding it', () => {
    // Arrange
    activatedRouteMock.pathFromRoot = [
      { snapshot: { data: {} } },
      { snapshot: { data: { hideNavbar: false } } },
    ];

    // Act
    component.ngOnInit();

    // Assert
    expect(component.showNavbar).toBeTrue();
  });

  it('recomputes navbar visibility on navigation end events', () => {
    // Arrange
    activatedRouteMock.pathFromRoot = [{ snapshot: { data: {} } }];
    component.ngOnInit();
    activatedRouteMock.pathFromRoot = [{ snapshot: { data: { hideNavbar: true } } }];

    // Act
    routerEvents$.next(new NavigationEnd(1, '/dashboard', '/dashboard'));

    // Assert
    expect(component.showNavbar).toBeFalse();
  });

  it('clears session and navigates to login on logout', () => {
    // Arrange

    // Act
    component.onLogout();

    // Assert
    expect(authSessionMock.clearSession).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('unsubscribes from router events on destroy', () => {
    // Arrange
    component.ngOnInit();
    const subscription = (component as unknown as { routerEventsSub?: { unsubscribe: () => void } }).routerEventsSub;
    expect(subscription).toBeDefined();
    const unsubscribeSpy = spyOn(subscription as { unsubscribe: () => void }, 'unsubscribe');

    // Act
    component.ngOnDestroy();

    // Assert
    expect(unsubscribeSpy).toHaveBeenCalled();
  });

  it('resolves deepest child route when nested children exist', () => {
    // Arrange
    const nestedRoute = {
      snapshot: { data: {} },
      pathFromRoot: [{ snapshot: { data: {} } }],
      firstChild: {
        snapshot: { data: {} },
        pathFromRoot: [{ snapshot: { data: {} } }],
        firstChild: {
          snapshot: { data: { hideNavbar: true } },
          pathFromRoot: [{ snapshot: { data: { hideNavbar: true } } }],
          firstChild: null,
        },
      },
    };
    activatedRouteMock.firstChild = nestedRoute.firstChild;
    activatedRouteMock.pathFromRoot = nestedRoute.pathFromRoot;

    // Act
    component.ngOnInit();

    // Assert
    expect(component.showNavbar).toBeFalse();
    activatedRouteMock.firstChild = null;
    activatedRouteMock.pathFromRoot = [{ snapshot: { data: {} } }];
  });
});
