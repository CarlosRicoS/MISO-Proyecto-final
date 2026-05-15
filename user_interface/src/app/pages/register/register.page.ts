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
  birthdate = '';
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

    if (this.passwordPolicyError) {
      return 'error';
    }

    return 'default';
  }

  get passwordPolicyError(): string {
    if (!this.password) {
      return '';
    }

    if (this.password.length < 8) {
      return 'REGISTER.PASSWORD_TOO_SHORT';
    }

    if (!/[A-Z]/.test(this.password)) {
      return 'REGISTER.PASSWORD_NO_UPPERCASE';
    }

    if (!/[0-9]/.test(this.password)) {
      return 'REGISTER.PASSWORD_NO_NUMBER';
    }

    return '';
  }

  get birthdateState(): ThInputState {
    if (!this.birthdate) {
      return this.hasSubmitted ? 'error' : 'default';
    }

    if (this.birthdateError) {
      return 'error';
    }

    return 'default';
  }

  get birthdateError(): string {
    if (!this.birthdate) {
      return '';
    }

    const parsed = new Date(this.birthdate);
    if (Number.isNaN(parsed.getTime())) {
      return 'REGISTER.BIRTHDATE_REQUIRED';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsed.getTime() > today.getTime()) {
      return 'REGISTER.BIRTHDATE_FUTURE';
    }

    const age = this.calculateAgeYears(parsed, today);
    if (age < 18) {
      return 'REGISTER.BIRTHDATE_UNDERAGE';
    }

    return '';
  }

  get birthdateHelper(): string {
    if (!this.birthdate && this.hasSubmitted) {
      return this.translate.instant('REGISTER.BIRTHDATE_REQUIRED');
    }

    if (this.birthdateError) {
      return this.translate.instant(this.birthdateError);
    }

    return '';
  }

  private calculateAgeYears(birthdate: Date, reference: Date): number {
    let age = reference.getFullYear() - birthdate.getFullYear();
    const monthDelta = reference.getMonth() - birthdate.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && reference.getDate() < birthdate.getDate())) {
      age -= 1;
    }
    return age;
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

    if (this.passwordPolicyError) {
      return this.translate.instant(this.passwordPolicyError);
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

  onBirthdateChange(value: string): void {
    this.birthdate = value;
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
      this.birthdateState === 'error' ||
      !this.acceptedTerms
    ) {
      return;
    }

    this.isLoading = true;
    try {
      const response = await firstValueFrom(
        this.authService.register(this.fullName.trim(), this.email.trim(), this.password, this.birthdate || undefined)
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
