import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { LoginPage } from './login.page';
import { AuthService, LoginResponse } from '../../core/services/auth.service';
import { NavController } from '@ionic/angular';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
  let authService: jasmine.SpyObj<AuthService>;
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
    const navControllerSpy = jasmine.createSpyObj('NavController', [
      'navigateForward',
      'navigateBack',
      'navigateRoot',
      'pop',
    ]);

    // Suppress console errors during Ionic component initialization
    spyOn(console, 'error').and.stub();
    spyOn(console, 'warn').and.stub();

    await TestBed.configureTestingModule({
      imports: [LoginPage, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NavController, useValue: navControllerSpy },
      ],
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    
    try {
      fixture.detectChanges();
    } catch (e) {
      // Suppress initialization errors during test setup
      void e;
    }
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty email and password', () => {
      expect(component.email).toBe('');
      expect(component.password).toBe('');
    });

    it('should initialize with hasSubmitted as false', () => {
      expect(component.hasSubmitted).toBe(false);
    });

    it('should initialize with isLoading as false', () => {
      expect(component.isLoading).toBe(false);
    });

    it('should initialize alert as closed', () => {
      expect(component.isAlertOpen).toBe(false);
    });
  });

  describe('Email Validation', () => {
    it('should return error state when email is empty and form submitted', () => {
      component.email = '';
      component.hasSubmitted = true;
      expect(component.emailState).toBe('error');
    });

    it('should return default state when email is empty and form not submitted', () => {
      component.email = '';
      component.hasSubmitted = false;
      expect(component.emailState).toBe('default');
    });

    it('should return error state for invalid email format', () => {
      component.email = 'invalidemail';
      expect(component.emailState).toBe('error');
    });

    it('should return error state for email without domain', () => {
      component.email = 'user@';
      expect(component.emailState).toBe('error');
    });

    it('should return error state for email without @', () => {
      component.email = 'userdomain.com';
      expect(component.emailState).toBe('error');
    });

    it('should return default state for valid email format', () => {
      component.email = 'user@example.com';
      expect(component.emailState).toBe('default');
    });

    it('should handle spaces in email validation', () => {
      component.email = '  user@example.com  ';
      expect(component.emailState).toBe('default');
    });
  });

  describe('Email Helper Text', () => {
    it('should show required message when email is empty and submitted', () => {
      component.email = '';
      component.hasSubmitted = true;
      expect(component.emailHelper).toBe('Email is required');
    });

    it('should show format error message for invalid email', () => {
      component.email = 'invalidemail';
      expect(component.emailHelper).toBe('Please enter a valid email format');
    });

    it('should return empty string for valid email', () => {
      component.email = 'user@example.com';
      expect(component.emailHelper).toBe('');
    });

    it('should return empty string when email empty but not submitted', () => {
      component.email = '';
      component.hasSubmitted = false;
      expect(component.emailHelper).toBe('');
    });
  });

  describe('Password Validation', () => {
    it('should return error state when password is empty and form submitted', () => {
      component.password = '';
      component.hasSubmitted = true;
      expect(component.passwordState).toBe('error');
    });

    it('should return default state when password is empty and form not submitted', () => {
      component.password = '';
      component.hasSubmitted = false;
      expect(component.passwordState).toBe('default');
    });

    it('should return default state for non-empty password', () => {
      component.password = 'password123';
      expect(component.passwordState).toBe('default');
    });

    it('should return error state for password with only whitespace', () => {
      component.password = '   ';
      component.hasSubmitted = true;
      expect(component.passwordState).toBe('error');
    });
  });

  describe('Password Helper Text', () => {
    it('should show required message when password is empty and submitted', () => {
      component.password = '';
      component.hasSubmitted = true;
      expect(component.passwordHelper).toBe('Password is required');
    });

    it('should return empty string for non-empty password', () => {
      component.password = 'mypassword';
      expect(component.passwordHelper).toBe('');
    });

    it('should return empty string when password empty but not submitted', () => {
      component.password = '';
      component.hasSubmitted = false;
      expect(component.passwordHelper).toBe('');
    });
  });

  describe('Input Change Handlers', () => {
    it('should update email on onEmailChange', () => {
      component.onEmailChange('newemail@example.com');
      expect(component.email).toBe('newemail@example.com');
    });

    it('should update password on onPasswordChange', () => {
      component.onPasswordChange('newpassword123');
      expect(component.password).toBe('newpassword123');
    });
  });

  describe('Sign In - Form Validation', () => {
    it('should set hasSubmitted to true on sign in attempt', async () => {
      component.email = 'valid@example.com';
      component.password = 'password123';
      authService.login.and.returnValue(of(mockLoginResponse));

      await component.onSignIn();

      expect(component.hasSubmitted).toBe(true);
    });

    it('should not make login request if email is invalid', async () => {
      component.email = 'invalidemail';
      component.password = 'password123';

      await component.onSignIn();

      expect(authService.login).not.toHaveBeenCalled();
      expect(component.isLoading).toBe(false);
    });

    it('should not make login request if password is empty', async () => {
      component.email = 'valid@example.com';
      component.password = '';

      await component.onSignIn();

      expect(authService.login).not.toHaveBeenCalled();
    });

    it('should not make login request if both email and password are invalid', async () => {
      component.email = 'invalidemail';
      component.password = '';

      await component.onSignIn();

      expect(authService.login).not.toHaveBeenCalled();
    });
  });

  describe('Sign In - Successful Login', () => {
    beforeEach(() => {
      authService.login.and.returnValue(of(mockLoginResponse));
      spyOn(localStorage, 'setItem');
    });

    it('should call authService.login with trimmed email and password', async () => {
      component.email = '  user@example.com  ';
      component.password = 'password123';

      await component.onSignIn();

      expect(authService.login).toHaveBeenCalledWith('user@example.com', 'password123');
    });

    it('should set isLoading to true during login process', (done) => {
      component.email = 'user@example.com';
      component.password = 'password123';

      const loginPromise = component.onSignIn();
      expect(component.isLoading).toBe(true);

      loginPromise.then(() => {
        expect(component.isLoading).toBe(false);
        done();
      });
    });

    it('should persist id_token to localStorage', async () => {
      component.email = 'user@example.com';
      component.password = 'password123';

      await component.onSignIn();

      expect(localStorage.setItem).toHaveBeenCalledWith('id_token', 'mock_id_token');
    });

    it('should persist access_token to localStorage', async () => {
      component.email = 'user@example.com';
      component.password = 'password123';

      await component.onSignIn();

      expect(localStorage.setItem).toHaveBeenCalledWith('access_token', 'mock_access_token');
    });

    it('should persist refresh_token to localStorage', async () => {
      component.email = 'user@example.com';
      component.password = 'password123';

      await component.onSignIn();

      expect(localStorage.setItem).toHaveBeenCalledWith('refresh_token', 'mock_refresh_token');
    });

    it('should persist expires_in to localStorage as string', async () => {
      component.email = 'user@example.com';
      component.password = 'password123';

      await component.onSignIn();

      expect(localStorage.setItem).toHaveBeenCalledWith('expires_in', '3600');
    });

    it('should persist token_type to localStorage', async () => {
      component.email = 'user@example.com';
      component.password = 'password123';

      await component.onSignIn();

      expect(localStorage.setItem).toHaveBeenCalledWith('token_type', 'Bearer');
    });

    it('should navigate to home after successful login', async () => {
      component.email = 'user@example.com';
      component.password = 'password123';

      await component.onSignIn();

      expect(router.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should set isLoading to false after successful login', async () => {
      component.email = 'user@example.com';
      component.password = 'password123';

      await component.onSignIn();

      expect(component.isLoading).toBe(false);
    });
  });

  describe('Sign In - Error Handling', () => {
    it('should show error alert on 401 unauthorized error', async () => {
      component.email = 'user@example.com';
      component.password = 'wrongpassword';

      const error = new Error('Unauthorized');
      (error as any).status = 401;
      authService.login.and.returnValue(throwError(() => error));

      await component.onSignIn();

      expect(component.isAlertOpen).toBe(true);
      expect(component.alertTitle).toBe('Login Failed');
      expect(component.alertMessage).toBe('Invalid email or password.');
    });

    it('should show generic error alert on other HTTP errors', async () => {
      component.email = 'user@example.com';
      component.password = 'password123';

      const error = new Error('Server Error');
      (error as any).status = 500;
      authService.login.and.returnValue(throwError(() => error));

      await component.onSignIn();

      expect(component.isAlertOpen).toBe(true);
      expect(component.alertTitle).toBe('Login Failed');
      expect(component.alertMessage).toBe('An error occurred. Please try again.');
    });

    it('should show generic error alert on network error', async () => {
      component.email = 'user@example.com';
      component.password = 'password123';

      const error = new Error('Network error');
      authService.login.and.returnValue(throwError(() => error));

      await component.onSignIn();

      expect(component.isAlertOpen).toBe(true);
      expect(component.alertMessage).toBe('An error occurred. Please try again.');
    });

    it('should set isLoading to false after error', async () => {
      component.email = 'user@example.com';
      component.password = 'password123';

      const error = new Error('Unauthorized');
      (error as any).status = 401;
      authService.login.and.returnValue(throwError(() => error));

      await component.onSignIn();

      expect(component.isLoading).toBe(false);
    });

    it('should not navigate after login error', async () => {
      component.email = 'user@example.com';
      component.password = 'wrongpassword';

      const error = new Error('Unauthorized');
      (error as any).status = 401;
      authService.login.and.returnValue(throwError(() => error));

      await component.onSignIn();

      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Alert Management', () => {
    it('should open alert with custom title and message', () => {
      component['showErrorAlert']('Custom Error');

      expect(component.isAlertOpen).toBe(true);
      expect(component.alertTitle).toBe('Login Failed');
      expect(component.alertMessage).toBe('Custom Error');
    });
  });

  describe('Email Format Validation', () => {
    it('should validate standard email format', () => {
      expect(component['isValidEmail']('user@example.com')).toBe(true);
    });

    it('should validate email with subdomain', () => {
      expect(component['isValidEmail']('user@mail.example.com')).toBe(true);
    });

    it('should validate email with numbers and dots', () => {
      expect(component['isValidEmail']('user.name+tag@example.co.uk')).toBe(true);
    });

    it('should reject email without @', () => {
      expect(component['isValidEmail']('userexample.com')).toBe(false);
    });

    it('should reject email without domain', () => {
      expect(component['isValidEmail']('user@')).toBe(false);
    });

    it('should reject email with spaces', () => {
      expect(component['isValidEmail']('user @example.com')).toBe(false);
    });

    it('should trim spaces before validation', () => {
      expect(component['isValidEmail']('  user@example.com  ')).toBe(true);
    });
  });

  describe('Multiple State Transitions', () => {
    it('should transition from error to default state when valid email entered', () => {
      component.email = 'invalid';
      expect(component.emailState).toBe('error');

      component.email = 'valid@example.com';
      expect(component.emailState).toBe('default');
    });

    it('should show both field errors when form submitted with empty fields', () => {
      component.hasSubmitted = true;
      expect(component.emailState).toBe('error');
      expect(component.passwordState).toBe('error');
      expect(component.emailHelper).toBe('Email is required');
      expect(component.passwordHelper).toBe('Password is required');
    });

    it('should clear helpers when fields become valid', () => {
      component.hasSubmitted = true;
      component.email = 'valid@example.com';
      component.password = 'validpass';

      expect(component.emailHelper).toBe('');
      expect(component.passwordHelper).toBe('');
    });
  });

  describe('Login Flow State Management', () => {
    beforeEach(() => {
      authService.login.and.returnValue(of(mockLoginResponse));
    });

    it('should reset isAlertOpen after error', async () => {
      component.email = 'user@example.com';
      component.password = 'password';
      const error = new Error('Unauthorized');
      (error as any).status = 401;
      authService.login.and.returnValue(throwError(() => error));

      await component.onSignIn();
      expect(component.isAlertOpen).toBe(true);

      // Reset
      component.isAlertOpen = false;
      expect(component.isAlertOpen).toBe(false);
    });

    it('should handle rapid consecutive sign in attempts', async () => {
      component.email = 'user@example.com';
      component.password = 'password';

      const firstCall = component.onSignIn();
      const secondCall = component.onSignIn();

      await Promise.all([firstCall, secondCall]);

      expect(authService.login.calls.count()).toBeGreaterThan(1);
    });
  });

  describe('Whitespace Handling', () => {
    it('should trim email on sign in', async () => {
      component.email = '  user@example.com  ';
      component.password = 'password';
      authService.login.and.returnValue(of(mockLoginResponse));

      await component.onSignIn();

      expect(authService.login).toHaveBeenCalledWith('user@example.com', 'password');
    });

    it('should treat password with only spaces as empty', () => {
      component.password = '   ';
      component.hasSubmitted = true;
      expect(component.passwordState).toBe('error');
    });

    it('should treat email with only spaces as empty', () => {
      component.email = '   ';
      component.hasSubmitted = true;
      expect(component.emailState).toBe('error');
    });
  });

  describe('localStorage Security', () => {
    beforeEach(() => {
      authService.login.and.returnValue(of(mockLoginResponse));
      spyOn(localStorage, 'setItem');
    });

    it('should persist all five token types', async () => {
      component.email = 'user@example.com';
      component.password = 'password';

      await component.onSignIn();

      expect(localStorage.setItem).toHaveBeenCalledWith('id_token', jasmine.any(String));
      expect(localStorage.setItem).toHaveBeenCalledWith('access_token', jasmine.any(String));
      expect(localStorage.setItem).toHaveBeenCalledWith('refresh_token', jasmine.any(String));
      expect(localStorage.setItem).toHaveBeenCalledWith('expires_in', jasmine.any(String));
      expect(localStorage.setItem).toHaveBeenCalledWith('token_type', jasmine.any(String));
    });

    it('should store expires_in as string not number', async () => {
      component.email = 'user@example.com';
      component.password = 'password';

      await component.onSignIn();

      const callsWithExpiresIn = (localStorage.setItem as jasmine.Spy).calls.all()
        .filter(call => call.args[0] === 'expires_in');
      
      expect(callsWithExpiresIn.length).toBeGreaterThan(0);
      expect(typeof callsWithExpiresIn[0].args[1]).toBe('string');
    });
  });
})
