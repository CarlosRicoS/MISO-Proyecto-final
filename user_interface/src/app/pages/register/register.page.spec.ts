import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { RegisterPage } from './register.page';
import { AuthService } from '../../core/services/auth.service';

describe('RegisterPage', () => {
  let component: RegisterPage;
  let fixture: ComponentFixture<RegisterPage>;
  const authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['register']);
  const routerSpy = jasmine.createSpyObj<Router>(
    'Router',
    ['navigate', 'createUrlTree', 'serializeUrl'],
    { events: of() }
  );
  const activatedRouteMock = {
    snapshot: { data: {} },
    params: of({}),
    queryParams: of({}),
    fragment: of(null),
    data: of({}),
    url: of([]),
  } as unknown as ActivatedRoute;

  const fillValidForm = (): void => {
    component.onFullNameChange('Juan Perez');
    component.onEmailChange('juan@example.com');
    component.onPasswordChange('MyPass123');
    component.onConfirmPasswordChange('MyPass123');
    component.onAcceptedTermsChange(true);
  };

  beforeEach(async () => {
    authServiceSpy.register.calls.reset();
    routerSpy.navigate.calls.reset();

    authServiceSpy.register.and.returnValue(
      of({ message: 'User registered successfully', email: 'test@example.com', role: 'travelers' })
    );
    routerSpy.navigate.and.resolveTo(true);
    routerSpy.createUrlTree.and.returnValue({} as never);
    routerSpy.serializeUrl.and.returnValue('/login');

    await TestBed.configureTestingModule({
      imports: [RegisterPage],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return expected state branches for full name and email', () => {
    component.hasSubmitted = false;
    component.onFullNameChange('');
    component.onEmailChange('');
    expect(component.fullNameState).toBe('default');
    expect(component.emailState).toBe('default');

    component.hasSubmitted = true;
    expect(component.fullNameState).toBe('error');
    expect(component.emailState).toBe('error');

    component.onFullNameChange('Juan Perez');
    component.onEmailChange('invalid-email');
    expect(component.fullNameState).toBe('default');
    expect(component.emailState).toBe('error');

    component.onEmailChange('juan@example.com');
    expect(component.emailState).toBe('default');
  });

  it('should return expected state branches for password and confirm password', () => {
    component.hasSubmitted = true;
    component.onPasswordChange('');
    component.onConfirmPasswordChange('');
    expect(component.passwordState).toBe('error');
    expect(component.confirmPasswordState).toBe('error');

    component.onPasswordChange('MyPass123');
    component.onConfirmPasswordChange('Mismatch123');
    expect(component.passwordState).toBe('default');
    expect(component.confirmPasswordState).toBe('error');

    component.onConfirmPasswordChange('MyPass123');
    expect(component.confirmPasswordState).toBe('default');
  });

  it('should cover helper and terms message branches', () => {
    component.hasSubmitted = true;
    component.onFullNameChange('');
    component.onEmailChange('');
    component.onPasswordChange('');
    component.onConfirmPasswordChange('');
    component.onAcceptedTermsChange(false);

    expect(component.fullNameHelper).toBe('Full name is required');
    expect(component.emailHelper).toBe('Email is required');
    expect(component.passwordHelper).toBe('Password is required');
    expect(component.confirmPasswordHelper).toBe('Confirm password is required');
    expect(component.termsHelper).toBe('You must accept Terms of Service and Privacy Policy');

    component.onEmailChange('not-an-email');
    expect(component.emailHelper).toBe('Please enter a valid email format');

    component.onPasswordChange('MyPass123');
    component.onConfirmPasswordChange('AnotherPass');
    expect(component.confirmPasswordHelper).toBe('Passwords do not match');

    component.onFullNameChange('Juan Perez');
    component.onEmailChange('juan@example.com');
    component.onConfirmPasswordChange('MyPass123');
    component.onAcceptedTermsChange(true);

    expect(component.fullNameHelper).toBe('');
    expect(component.emailHelper).toBe('');
    expect(component.passwordHelper).toBe('');
    expect(component.confirmPasswordHelper).toBe('');
    expect(component.termsHelper).toBe('');
  });

  it('should toggle password visibility icons and types', () => {
    expect(component.passwordInputType).toBe('password');
    expect(component.confirmPasswordInputType).toBe('password');
    expect(component.passwordTrailIcon).toBe('eye-outline');
    expect(component.confirmPasswordTrailIcon).toBe('eye-outline');

    component.onTogglePasswordVisibility();
    component.onToggleConfirmPasswordVisibility();

    expect(component.passwordInputType).toBe('text');
    expect(component.confirmPasswordInputType).toBe('text');
    expect(component.passwordTrailIcon).toBe('eye-off-outline');
    expect(component.confirmPasswordTrailIcon).toBe('eye-off-outline');
  });

  it('should not call register service when form is invalid', async () => {
    component.onEmailChange('invalid-email');

    await component.onCreateAccount();

    expect(authServiceSpy.register).not.toHaveBeenCalled();
    expect(component.hasSubmitted).toBeTrue();
  });

  it('should call register service with full_name, email, and password when form is valid', async () => {
    fillValidForm();

    await component.onCreateAccount();

    expect(authServiceSpy.register).toHaveBeenCalledWith('Juan Perez', 'juan@example.com', 'MyPass123');
    expect(component.isAlertOpen).toBeTrue();
    expect(component.alertTitle).toBe('Account Created');
    expect(component.shouldNavigateToLogin).toBeTrue();
  });

  it('should show backend detail on 409 and not navigate to login', async () => {
    fillValidForm();
    authServiceSpy.register.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'Email already in use' } }))
    );

    await component.onCreateAccount();

    expect(component.isAlertOpen).toBeTrue();
    expect(component.alertTitle).toBe('Registration Failed');
    expect(component.alertMessage).toBe('Email already in use');
    expect(component.shouldNavigateToLogin).toBeFalse();
  });

  it('should show backend detail on 400 and not navigate to login', async () => {
    fillValidForm();
    authServiceSpy.register.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'Password does not meet criteria' } }))
    );

    await component.onCreateAccount();

    expect(component.isAlertOpen).toBeTrue();
    expect(component.alertTitle).toBe('Registration Failed');
    expect(component.alertMessage).toBe('Password does not meet criteria');
    expect(component.shouldNavigateToLogin).toBeFalse();
  });

  it('should show fallback message when backend 409 has no detail', async () => {
    fillValidForm();
    authServiceSpy.register.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: {} }))
    );

    await component.onCreateAccount();

    expect(component.alertTitle).toBe('Registration Failed');
    expect(component.alertMessage).toBe('Email is already in use.');
  });

  it('should show fallback message when backend 400 has no detail', async () => {
    fillValidForm();
    authServiceSpy.register.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: {} }))
    );

    await component.onCreateAccount();

    expect(component.alertTitle).toBe('Registration Failed');
    expect(component.alertMessage).toBe('Password does not meet criteria.');
  });

  it('should show generic fallback for unexpected errors', async () => {
    fillValidForm();
    authServiceSpy.register.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500, error: {} }))
    );

    await component.onCreateAccount();

    expect(component.alertTitle).toBe('Registration Failed');
    expect(component.alertMessage).toBe('An error occurred. Please try again.');
    expect(component.shouldNavigateToLogin).toBeFalse();
  });

  it('should navigate to login on alert dismiss after successful registration', async () => {
    fillValidForm();
    await component.onCreateAccount();

    await component.onAlertDismiss();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    expect(component.shouldNavigateToLogin).toBeFalse();
  });

  it('should not navigate on alert dismiss when previous registration failed', async () => {
    fillValidForm();
    authServiceSpy.register.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'Invalid password' } }))
    );

    await component.onCreateAccount();
    await component.onAlertDismiss();

    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });
});
