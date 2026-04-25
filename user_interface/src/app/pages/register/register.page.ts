import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { ThButtonComponent } from '../../shared/components/th-button/th-button.component';
import { ThPopupComponent, ThPopupVariant } from '../../shared/components/th-popup/th-popup.component';
import {
  ThInputComponent,
  ThInputState,
  ThInputType,
} from '../../shared/components/th-input/th-input.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonicModule,
    ThInputComponent,
    ThButtonComponent,
    ThPopupComponent,
  ],
})
export class RegisterPage {
  private readonly authService: AuthService;
  private readonly router: Router;

  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  acceptedTerms = false;
  hasSubmitted = false;
  isPasswordVisible = false;
  isConfirmPasswordVisible = false;
  isLoading = false;
  isAlertOpen = false;
  alertTitle = '';
  alertMessage = '';
  alertVariant: ThPopupVariant = 'info';
  shouldNavigateToLogin = false;

  constructor(authService: AuthService, router: Router) {
    this.authService = authService;
    this.router = router;
  }

  get fullNameState(): ThInputState {
    if (!this.fullName.trim()) {
      return this.hasSubmitted ? 'error' : 'default';
    }

    return 'default';
  }

  get emailState(): ThInputState {
    if (!this.email.trim()) {
      return this.hasSubmitted ? 'error' : 'default';
    }

    if (!this.isValidEmail(this.email)) {
      return 'error';
    }

    return 'default';
  }

  get passwordState(): ThInputState {
    if (!this.password.trim()) {
      return this.hasSubmitted ? 'error' : 'default';
    }

    return 'default';
  }

  get confirmPasswordState(): ThInputState {
    if (!this.confirmPassword.trim()) {
      return this.hasSubmitted ? 'error' : 'default';
    }

    if (this.confirmPassword && this.password !== this.confirmPassword) {
      return 'error';
    }

    return 'default';
  }

  get passwordInputType(): ThInputType {
    return this.isPasswordVisible ? 'text' : 'password';
  }

  get confirmPasswordInputType(): ThInputType {
    return this.isConfirmPasswordVisible ? 'text' : 'password';
  }

  get passwordTrailIcon(): string {
    return this.isPasswordVisible ? 'eye-off-outline' : 'eye-outline';
  }

  get confirmPasswordTrailIcon(): string {
    return this.isConfirmPasswordVisible ? 'eye-off-outline' : 'eye-outline';
  }

  get fullNameHelper(): string {
    if (!this.fullName.trim() && this.hasSubmitted) {
      return 'Full name is required';
    }

    return '';
  }

  get emailHelper(): string {
    if (!this.email.trim() && this.hasSubmitted) {
      return 'Email is required';
    }

    if (this.email.trim() && !this.isValidEmail(this.email)) {
      return 'Please enter a valid email format';
    }

    return '';
  }

  get passwordHelper(): string {
    if (!this.password.trim() && this.hasSubmitted) {
      return 'Password is required';
    }

    return '';
  }

  get confirmPasswordHelper(): string {
    if (!this.confirmPassword.trim() && this.hasSubmitted) {
      return 'Confirm password is required';
    }

    if (this.confirmPassword && this.password !== this.confirmPassword) {
      return 'Passwords do not match';
    }

    return '';
  }

  get termsHelper(): string {
    if (this.hasSubmitted && !this.acceptedTerms) {
      return 'You must accept Terms of Service and Privacy Policy';
    }

    return '';
  }

  onFullNameChange(value: string): void {
    this.fullName = value;
  }

  onEmailChange(value: string): void {
    this.email = value;
  }

  onPasswordChange(value: string): void {
    this.password = value;
  }

  onConfirmPasswordChange(value: string): void {
    this.confirmPassword = value;
  }

  onTogglePasswordVisibility(): void {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  onToggleConfirmPasswordVisibility(): void {
    this.isConfirmPasswordVisible = !this.isConfirmPasswordVisible;
  }

  onAcceptedTermsChange(value: boolean): void {
    this.acceptedTerms = value;
  }

  async onCreateAccount(): Promise<void> {
    this.hasSubmitted = true;

    if (
      this.fullNameState === 'error' ||
      this.emailState === 'error' ||
      this.passwordState === 'error' ||
      this.confirmPasswordState === 'error' ||
      !this.acceptedTerms
    ) {
      return;
    }

    this.isLoading = true;
    try {
      const response = await firstValueFrom(
        this.authService.register(this.fullName.trim(), this.email.trim(), this.password)
      );
      this.showAlert('Account Created', response.message, 'success');
      this.shouldNavigateToLogin = true;
    } catch (error) {
      const httpError = error as HttpErrorResponse;
      const detail = this.resolveBackendDetailMessage(httpError);

      if (httpError.status === 409) {
        this.showAlert('Registration Failed', detail || 'Email is already in use.', 'error');
      } else if (httpError.status === 400) {
        this.showAlert('Registration Failed', detail || 'Password does not meet criteria.', 'error');
      } else {
        this.showAlert('Registration Failed', detail || 'An error occurred. Please try again.', 'error');
      }
      this.shouldNavigateToLogin = false;
    } finally {
      this.isLoading = false;
    }
  }

  async onAlertDismiss(): Promise<void> {
    this.isAlertOpen = false;
    if (this.shouldNavigateToLogin) {
      this.shouldNavigateToLogin = false;
      await this.router.navigate(['/login']);
    }
  }

  private resolveBackendDetailMessage(error: HttpErrorResponse): string {
    const detail = error?.error?.detail;
    return typeof detail === 'string' ? detail : '';
  }

  private showAlert(title: string, message: string, variant: ThPopupVariant = 'info'): void {
    this.alertTitle = title;
    this.alertMessage = message;
    this.alertVariant = variant;
    this.isAlertOpen = true;
  }

  private isValidEmail(value: string): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(value.trim());
  }

}
