import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { bookingListAuthGuard } from './booking-list-auth.guard';
import { AuthSessionService } from '../services/auth-session.service';

describe('bookingListAuthGuard', () => {
  const authSessionStub = { isLoggedIn: false };

  beforeEach(() => {
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

  it('allows navigation when user is authenticated', () => {
    authSessionStub.isLoggedIn = true;

    const result = TestBed.runInInjectionContext(() =>
      bookingListAuthGuard({} as any, { url: '/booking-list' } as any),
    );

    expect(result).toBeTrue();
  });

  it('redirects to login with booking-list returnUrl when user is not authenticated', () => {
    authSessionStub.isLoggedIn = false;

    const result = TestBed.runInInjectionContext(() =>
      bookingListAuthGuard({} as any, { url: '/booking-list' } as any),
    ) as UrlTree;

    const router = TestBed.inject(Router);
    const expectedTree = router.createUrlTree(['/login'], {
      queryParams: { returnUrl: '/booking-list' },
    });

    expect(router.serializeUrl(result)).toBe(router.serializeUrl(expectedTree));
  });

  it('keeps the original booking-list query string in returnUrl', () => {
    authSessionStub.isLoggedIn = false;

    const result = TestBed.runInInjectionContext(() =>
      bookingListAuthGuard({} as any, { url: '/booking-list?status=upcoming' } as any),
    ) as UrlTree;

    const router = TestBed.inject(Router);
    const expectedTree = router.createUrlTree(['/login'], {
      queryParams: { returnUrl: '/booking-list?status=upcoming' },
    });

    expect(router.serializeUrl(result)).toBe(router.serializeUrl(expectedTree));
  });

  it('falls back to /booking-list returnUrl when state url is empty', () => {
    authSessionStub.isLoggedIn = false;

    const result = TestBed.runInInjectionContext(() =>
      bookingListAuthGuard({} as any, { url: '' } as any),
    ) as UrlTree;

    const router = TestBed.inject(Router);
    const expectedTree = router.createUrlTree(['/login'], {
      queryParams: { returnUrl: '/booking-list' },
    });

    expect(router.serializeUrl(result)).toBe(router.serializeUrl(expectedTree));
  });
});
