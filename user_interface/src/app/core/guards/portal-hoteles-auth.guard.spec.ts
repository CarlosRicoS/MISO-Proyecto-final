import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { portalHotelesAuthGuard } from './portal-hoteles-auth.guard';
import { AuthSessionService } from '../services/auth-session.service';

describe('portalHotelesAuthGuard', () => {
  let isLoggedIn = false;
  const authSessionStub = {
    get isLoggedIn(): boolean {
      return isLoggedIn;
    },
  } as AuthSessionService;

  beforeEach(() => {
    isLoggedIn = false;

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        {
          provide: AuthSessionService,
          useValue: authSessionStub,
        },
      ],
    });
  });

  it('allows navigation when the session is authenticated', () => {
    // Arrange
    isLoggedIn = true;

    // Act
    const result = TestBed.runInInjectionContext(() =>
      portalHotelesAuthGuard({} as any, { url: '/home' } as any),
    );

    // Assert
    expect(result).toBeTrue();
  });

  it('redirects to login with the current url when the session is not authenticated', () => {
    // Arrange
    isLoggedIn = false;
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    // Act
    const result = TestBed.runInInjectionContext(() =>
      portalHotelesAuthGuard({} as any, { url: '/home' } as any),
    );

    // Assert
    expect(result).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/home' },
    });
  });

  it('keeps the original query string in returnUrl when redirecting', () => {
    // Arrange
    isLoggedIn = false;
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    // Act
    const result = TestBed.runInInjectionContext(() =>
      portalHotelesAuthGuard({} as any, { url: '/home?tab=alerts' } as any),
    );

    // Assert
    expect(result).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/home?tab=alerts' },
    });
  });
});
