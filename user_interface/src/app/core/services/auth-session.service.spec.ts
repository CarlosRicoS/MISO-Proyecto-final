import { TestBed } from '@angular/core/testing';
import { AuthSessionService } from './auth-session.service';
import { LoginResponse } from './auth.service';

describe('AuthSessionService', () => {
  let service: AuthSessionService;

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
});