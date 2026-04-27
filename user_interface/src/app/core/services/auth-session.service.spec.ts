import { TestBed } from '@angular/core/testing';
import { take, skip } from 'rxjs/operators';
import { AuthSessionService } from './auth-session.service';
import { LoginResponse } from './auth.service';

describe('AuthSessionService', () => {
  let service: AuthSessionService;

  const createJwt = (payload: Record<string, unknown>): string => {
    const base64UrlPayload = btoa(JSON.stringify(payload))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return `header.${base64UrlPayload}.signature`;
  };

  const mockResponse: LoginResponse = {
    id_token: 'id-token',
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    token_type: 'Bearer',
  };

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthSessionService);
  });

  it('starts logged out when storage is empty', () => {
    expect(service.isLoggedIn).toBeFalse();
    expect(service.loginResponse).toBeNull();
  });

  it('stores and restores the full login response', () => {
    service.setLoginResponse(mockResponse);

    expect(service.isLoggedIn).toBeTrue();
    expect(service.loginResponse).toEqual(mockResponse);
    expect(service.idToken).toBe('id-token');
    expect(service.accessToken).toBe('access-token');
    expect(service.refreshToken).toBe('refresh-token');

    const storedValue = sessionStorage.getItem('th_auth_session');
    expect(storedValue).not.toBeNull();

    const parsed = JSON.parse(storedValue as string) as LoginResponse;
    expect(parsed).toEqual(mockResponse);
  });

  it('clears session state', () => {
    service.setLoginResponse(mockResponse);
    service.clearSession();

    expect(service.isLoggedIn).toBeFalse();
    expect(service.loginResponse).toBeNull();
    expect(sessionStorage.getItem('th_auth_session')).toBeNull();
  });

  it('reads user id and email from id token claims', () => {
    const tokenWithClaims = createJwt({
      sub: 'user-123',
      email: 'user@example.com',
    });

    service.setLoginResponse({
      ...mockResponse,
      id_token: tokenWithClaims,
    });

    expect(service.userId).toBe('user-123');
    expect(service.userEmail).toBe('user@example.com');
  });

  describe('fallback claim names', () => {
    it('reads user id from user_id claim when sub is not present', () => {
      const tokenWithClaims = createJwt({
        user_id: 'user-456',
      });

      service.setLoginResponse({
        ...mockResponse,
        id_token: tokenWithClaims,
      });

      expect(service.userId).toBe('user-456');
    });

    it('reads user id from cognito:username when sub and user_id are not present', () => {
      const tokenWithClaims = createJwt({
        'cognito:username': 'cognito-user-789',
      });

      service.setLoginResponse({
        ...mockResponse,
        id_token: tokenWithClaims,
      });

      expect(service.userId).toBe('cognito-user-789');
    });

    it('reads user email from username claim when email is not present', () => {
      const tokenWithClaims = createJwt({
        username: 'testuser@example.com',
      });

      service.setLoginResponse({
        ...mockResponse,
        id_token: tokenWithClaims,
      });

      expect(service.userEmail).toBe('testuser@example.com');
    });

    it('returns empty string when no user id claims are present', () => {
      const tokenWithClaims = createJwt({
        some_other_claim: 'value',
      });

      service.setLoginResponse({
        ...mockResponse,
        id_token: tokenWithClaims,
      });

      expect(service.userId).toBe('');
    });

    it('returns empty string when no email claims are present', () => {
      const tokenWithClaims = createJwt({
        sub: 'user-123',
      });

      service.setLoginResponse({
        ...mockResponse,
        id_token: tokenWithClaims,
      });

      expect(service.userEmail).toBe('');
    });
  });

  describe('token property fallbacks', () => {
    it('returns empty string for accessToken when loginResponse is null', () => {
      expect(service.accessToken).toBe('');
    });

    it('returns empty string for idToken when loginResponse is null', () => {
      expect(service.idToken).toBe('');
    });

    it('returns empty string for refreshToken when loginResponse is null', () => {
      expect(service.refreshToken).toBe('');
    });
  });

  describe('state observables', () => {
    it('emits state$ when login response is set', (done) => {
      service.state$
        .pipe(skip(1), take(1))
        .subscribe((state) => {
          expect(state.loggedIn).toBeTrue();
          expect(state.loginResponse).toEqual(mockResponse);
          done();
        });

      service.setLoginResponse(mockResponse);
    });

    it('emits isLoggedIn$ when login state changes', (done) => {
      const states: boolean[] = [];
      service.isLoggedIn$.subscribe((loggedIn) => {
        states.push(loggedIn);
        if (states.length === 2) {
          expect(states[0]).toBeFalse();
          expect(states[1]).toBeTrue();
          done();
        }
      });

      service.setLoginResponse(mockResponse);
    });

    it('does not emit duplicate isLoggedIn$ values', (done) => {
      const states: boolean[] = [];
      service.isLoggedIn$.subscribe((loggedIn) => {
        states.push(loggedIn);
      });

      service.setLoginResponse(mockResponse);
      service.setLoginResponse({ ...mockResponse, access_token: 'different-token' });

      setTimeout(() => {
        expect(states.length).toBe(2); // Only 2: false (initial) and true (after first set)
        done();
      }, 100);
    });
  });

  describe('corrupted storage', () => {
    it('handles invalid JSON in storage gracefully on initialization', () => {
      // Clear first, then set corrupted data before service initialization
      sessionStorage.clear();
      sessionStorage.setItem('th_auth_session', 'not valid json {]');
      
      // Create a fresh service that will try to parse corrupted data
      const testBed = TestBed.resetTestingModule();
      testBed.configureTestingModule({});
      const newService = TestBed.inject(AuthSessionService);
      
      // Service should treat corrupted data as not logged in
      expect(newService.isLoggedIn).toBeFalse();
      expect(newService.loginResponse).toBeNull();
    });

    it('treats response without access_token as logged out', () => {
      sessionStorage.clear();
      const responseWithoutAccessToken: LoginResponse = {
        id_token: 'id-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        access_token: '',
      };

      sessionStorage.setItem('th_auth_session', JSON.stringify(responseWithoutAccessToken));
      
      const testBed = TestBed.resetTestingModule();
      testBed.configureTestingModule({});
      const newService = TestBed.inject(AuthSessionService);
      
      expect(newService.isLoggedIn).toBeFalse();
    });
  });
});