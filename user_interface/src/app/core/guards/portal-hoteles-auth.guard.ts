import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from '../services/auth-session.service';

export const portalHotelesAuthGuard: CanActivateFn = (_route, state) => {
  const authSession = inject(AuthSessionService);
  const router = inject(Router);

  if (authSession.isLoggedIn) {
    return true;
  }

  void router.navigate(['/login'], {
    queryParams: { returnUrl: state.url },
  });

  return false;
};
