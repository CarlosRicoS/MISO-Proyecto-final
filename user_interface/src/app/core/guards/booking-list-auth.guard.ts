import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from '../services/auth-session.service';

export const bookingListAuthGuard: CanActivateFn = (_route, state) => {
  const authSessionService = inject(AuthSessionService);
  const router = inject(Router);

  if (authSessionService.isLoggedIn && !authSessionService.isTokenExpired) {
    return true;
  }

  // Token expired (or no session at all) — clear and redirect to login.
  if (authSessionService.isLoggedIn) {
    authSessionService.clearSession();
  }

  return router.createUrlTree(['/login'], {
    queryParams: {
      returnUrl: state.url || '/booking-list',
    },
  });
};
