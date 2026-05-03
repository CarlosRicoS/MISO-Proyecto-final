import { Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, map } from 'rxjs';
import { AppCacheService } from './app-cache.service';
import { LoginResponse } from './auth.service';

export interface AuthSessionState {
  loggedIn: boolean;
  loginResponse: LoginResponse | null;
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly storageKey = 'th_auth_session';
  private readonly stateSubject = new BehaviorSubject<AuthSessionState>(this.readState());

  constructor(private readonly cache: AppCacheService) {}

  readonly state$ = this.stateSubject.asObservable();
  readonly isLoggedIn$ = this.state$.pipe(
    map((state) => state.loggedIn),
    distinctUntilChanged(),
  );

  setLoginResponse(loginResponse: LoginResponse): void {
    const nextState: AuthSessionState = {
      loggedIn: true,
      loginResponse,
    };

    this.persistState(nextState);
    this.stateSubject.next(nextState);
  }

  clearSession(): void {
    this.cache.remove(this.storageKey);

    this.stateSubject.next({ loggedIn: false, loginResponse: null });
  }

  get isLoggedIn(): boolean {
    return this.stateSubject.value.loggedIn;
  }

  get loginResponse(): LoginResponse | null {
    return this.stateSubject.value.loginResponse;
  }

  get accessToken(): string {
    return this.stateSubject.value.loginResponse?.access_token ?? '';
  }

  get idToken(): string {
    return this.stateSubject.value.loginResponse?.id_token ?? '';
  }

  get refreshToken(): string {
    return this.stateSubject.value.loginResponse?.refresh_token ?? '';
  }

  get userId(): string {
    return this.getClaimValue('sub', 'user_id', 'cognito:username');
  }

  get userEmail(): string {
    return this.getClaimValue('email', 'username');
  }

  private readState(): AuthSessionState {
    const storedValue = this.cache.read<LoginResponse>(this.storageKey);
    if (!storedValue) {
      return { loggedIn: false, loginResponse: null };
    }

    return {
      loggedIn: Boolean(storedValue?.access_token),
      loginResponse: storedValue,
    };
  }

  private persistState(state: AuthSessionState): void {
    if (!state.loginResponse) {
      this.cache.remove(this.storageKey);
      return;
    }

    this.cache.write(this.storageKey, state.loginResponse);
  }

  private getClaimValue(...keys: string[]): string {
    const loginResponse = this.stateSubject.value.loginResponse;
    const claims = [
      this.decodeJwtPayload(loginResponse?.id_token ?? ''),
      this.decodeJwtPayload(loginResponse?.access_token ?? ''),
    ];

    for (const claimSet of claims) {
      if (!claimSet) {
        continue;
      }

      for (const key of keys) {
        const value = claimSet[key];
        if (typeof value === 'string' && value.trim()) {
          return value;
        }
      }
    }

    return '';
  }

  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    if (!token) {
      return null;
    }

    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }

    try {
      const normalizedPayload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decodedPayload = atob(normalizedPayload);
      return JSON.parse(decodedPayload) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}