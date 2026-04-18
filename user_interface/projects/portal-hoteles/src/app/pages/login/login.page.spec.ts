import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { AuthService, LoginResponse } from '@travelhub/core/services/auth.service';
import { AuthSessionService } from '@travelhub/core/services/auth-session.service';
import { PortalHotelesLoginPage } from './login.page';

describe('PortalHotelesLoginPage', () => {
  let component: PortalHotelesLoginPage;
  let fixture: ComponentFixture<PortalHotelesLoginPage>;
  let authService: jasmine.SpyObj<AuthService>;
  let authSessionService: jasmine.SpyObj<AuthSessionService>;
  let router: Router;

  const mockLoginResponse: LoginResponse = {
    id_token: 'mock_id_token',
    access_token: 'mock_access_token',
    refresh_token: 'mock_refresh_token',
    expires_in: 3600,
    token_type: 'Bearer',
  };

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);
    const authSessionServiceSpy = jasmine.createSpyObj('AuthSessionService', ['setLoginResponse']);

    await TestBed.configureTestingModule({
      imports: [PortalHotelesLoginPage, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: AuthSessionService, useValue: authSessionServiceSpy },
      ],
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    authSessionService = TestBed.inject(AuthSessionService) as jasmine.SpyObj<AuthSessionService>;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(PortalHotelesLoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    // Arrange

    // Act
    const instance = component;

    // Assert
    expect(instance).toBeTruthy();
  });

  it('should return email format error for invalid emails', () => {
    // Arrange
    component.email = 'invalid-email';

    // Act
    const state = component.emailState;
    const helper = component.emailHelper;

    // Assert
    expect(state).toBe('error');
    expect(helper).toBe('Please enter a valid email format');
  });

  it('should mark email as required after submit when empty', async () => {
    // Arrange
    component.email = '';
    component.password = 'password123';

    // Act
    await component.onSignIn();

    // Assert
    expect(component.emailState).toBe('error');
    expect(component.emailHelper).toBe('Email is required');
  });

  it('should mark password as required after submit when empty', async () => {
    // Arrange
    component.email = 'operator@travelhub.com';
    component.password = '';

    // Act
    await component.onSignIn();

    // Assert
    expect(component.passwordState).toBe('error');
    expect(component.passwordHelper).toBe('Password is required');
  });

  it('toggles password visibility and trail icon', () => {
    // Arrange
    expect(component.passwordInputType).toBe('password');
    expect(component.passwordTrailIcon).toBe('eye-outline');

    // Act
    component.onTogglePasswordVisibility();

    // Assert
    expect(component.passwordInputType).toBe('text');
    expect(component.passwordTrailIcon).toBe('eye-off-outline');
  });

  it('navigates to register page', () => {
    // Arrange

    // Act
    component.onGoToRegister();

    // Assert
    expect(router.navigate).toHaveBeenCalledWith(['/register']);
  });

  it('should not call login when form is invalid', async () => {
    // Arrange
    component.email = 'invalid-email';
    component.password = '';

    // Act
    await component.onSignIn();

    // Assert
    expect(authService.login).not.toHaveBeenCalled();
    expect(component.hasSubmitted).toBeTrue();
  });

  it('should persist session and navigate to /dashboard on successful login', async () => {
    // Arrange
    component.email = 'operator@travelhub.com';
    component.password = 'password123';
    authService.login.and.returnValue(of(mockLoginResponse));

    // Act
    await component.onSignIn();

    // Assert
    expect(authService.login).toHaveBeenCalledWith('operator@travelhub.com', 'password123');
    expect(authSessionService.setLoginResponse).toHaveBeenCalledWith(mockLoginResponse);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should show invalid-credentials alert on 401', async () => {
    // Arrange
    component.email = 'operator@travelhub.com';
    component.password = 'wrong-password';
    const unauthorizedError = new Error('Unauthorized') as Error & { status: number };
    unauthorizedError.status = 401;
    authService.login.and.returnValue(throwError(() => unauthorizedError));

    // Act
    await component.onSignIn();

    // Assert
    expect(component.isAlertOpen).toBeTrue();
    expect(component.alertTitle).toBe('Login Failed');
    expect(component.alertMessage).toBe('Invalid email or password.');
  });

  it('should show generic error alert on non-401 errors', async () => {
    // Arrange
    component.email = 'operator@travelhub.com';
    component.password = 'password123';
    const genericError = new Error('Server error') as Error & { status: number };
    genericError.status = 500;
    authService.login.and.returnValue(throwError(() => genericError));

    // Act
    await component.onSignIn();

    // Assert
    expect(component.isAlertOpen).toBeTrue();
    expect(component.alertTitle).toBe('Login Failed');
    expect(component.alertMessage).toBe('An error occurred. Please try again.');
    expect(component.isLoading).toBeFalse();
  });
});
