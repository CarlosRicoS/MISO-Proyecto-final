import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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
    TranslateModule,
    ThInputComponent,
    ThButtonComponent,
    ThPopupComponent,
  ],
})
export class RegisterPage {
  private readonly authService: AuthService;
  private readonly router: Router;
  private readonly translate = inject(TranslateService);

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
      return this.translate.instant('REGISTER.FULL_NAME_REQUIRED');
    }

    return '';
  }

  get emailHelper(): string {
    if (!this.email.trim() && this.hasSubmitted) {
      return this.translate.instant('REGISTER.EMAIL_REQUIRED');
    }

    if (this.email.trim() && !this.isValidEmail(this.email)) {
      return this.translate.instant('REGISTER.EMAIL_INVALID');
    }

    return '';
  }

  get passwordHelper(): string {
    if (!this.password.trim() && this.hasSubmitted) {
      return this.translate.instant('REGISTER.PASSWORD_REQUIRED');
    }

    return '';
  }

  get confirmPasswordHelper(): string {
    if (!this.confirmPassword.trim() && this.hasSubmitted) {
      return this.translate.instant('REGISTER.CONFIRM_PASSWORD_REQUIRED');
    }

    if (this.confirmPassword && this.password !== this.confirmPassword) {
      return this.translate.instant('REGISTER.PASSWORDS_MISMATCH');
    }

    return '';
  }

  get termsHelper(): string {
    if (this.hasSubmitted && !this.acceptedTerms) {
      return this.translate.instant('REGISTER.TERMS_REQUIRED');
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
      this.showAlert(
        this.translate.instant('REGISTER.ALERT_TITLE_SUCCESS'),
        response.message,
        'success',
      );
      this.shouldNavigateToLogin = true;
    } catch (error) {
      const httpError = error as HttpErrorResponse;
      const detail = this.resolveBackendDetailMessage(httpError);
      const failedTitle = this.translate.instant('REGISTER.ALERT_TITLE_FAILED');

      if (httpError.status === 409) {
        this.showAlert(failedTitle, detail || this.translate.instant('REGISTER.EMAIL_IN_USE'), 'error');
      } else if (httpError.status === 400) {
        this.showAlert(failedTitle, detail || this.translate.instant('REGISTER.PASSWORD_CRITERIA'), 'error');
      } else {
        this.showAlert(failedTitle, detail || this.translate.instant('REGISTER.GENERIC_ERROR'), 'error');
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
