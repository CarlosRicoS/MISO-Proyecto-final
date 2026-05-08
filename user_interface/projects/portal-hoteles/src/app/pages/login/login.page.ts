import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCol,
  IonContent,
  IonGrid,
  IonRow,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@travelhub/core/services/auth.service';
import { AuthSessionService } from '@travelhub/core/services/auth-session.service';
import { CurrencyConversionService } from '@travelhub/core/services/currency-conversion.service';
import { ThButtonComponent } from '@travelhub/shared/components/th-button/th-button.component';
import { ThPopupComponent } from '@travelhub/shared/components/th-popup/th-popup.component';
import {
  ThInputComponent,
  ThInputState,
  ThInputType,
} from '@travelhub/shared/components/th-input/th-input.component';

@Component({
  selector: 'portal-hoteles-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonButton,
    IonCard,
    IonCardContent,
    IonCol,
    IonContent,
    IonGrid,
    IonRow,
    IonSpinner,
    TranslateModule,
    ThInputComponent,
    ThButtonComponent,
    ThPopupComponent,
  ],
})
export class PortalHotelesLoginPage {
  private readonly authService = inject(AuthService);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly currencyConversionService = inject(CurrencyConversionService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  email = '';
  password = '';
  hasSubmitted = false;
  isAlertOpen = false;
  alertTitle = '';
  alertMessage = '';
  isLoading = false;
  isPasswordVisible = false;

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
    if (!this.password.trim() && this.hasSubmitted) {
      return 'error';
    }

    return 'default';
  }

  get passwordInputType(): ThInputType {
    return this.isPasswordVisible ? 'text' : 'password';
  }

  get passwordTrailIcon(): string {
    return this.isPasswordVisible ? 'eye-off-outline' : 'eye-outline';
  }

  get emailHelper(): string {
    if (!this.email.trim() && this.hasSubmitted) {
      return this.translate.instant('LOGIN.EMAIL_REQUIRED');
    }

    if (this.email.trim() && !this.isValidEmail(this.email)) {
      return this.translate.instant('LOGIN.EMAIL_INVALID');
    }

    return '';
  }

  get passwordHelper(): string {
    if (!this.password.trim() && this.hasSubmitted) {
      return this.translate.instant('LOGIN.PASSWORD_REQUIRED');
    }

    return '';
  }

  onEmailChange(value: string): void {
    this.email = value;
  }

  onPasswordChange(value: string): void {
    this.password = value;
  }

  onTogglePasswordVisibility(): void {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  onGoToRegister(): void {
    void this.router.navigate(['/register']);
  }

  async onSignIn(): Promise<void> {
    this.hasSubmitted = true;

    if (this.emailState === 'error' || this.passwordState === 'error') {
      return;
    }

    this.isLoading = true;
    try {
      const response = await firstValueFrom(
        this.authService.login(this.email.trim(), this.password),
      );

      this.authSessionService.setLoginResponse(response);
      void this.currencyConversionService.ensureRatesLoaded();

      await this.router.navigate(['/dashboard']);
    } catch (error) {
      const httpError = error as HttpErrorResponse;
      if (httpError.status === 401) {
        this.showErrorAlert(this.translate.instant('LOGIN.INVALID_CREDENTIALS'));
      } else {
        this.showErrorAlert(this.translate.instant('LOGIN.GENERIC_ERROR'));
      }
    } finally {
      this.isLoading = false;
    }
  }

  private showErrorAlert(message: string): void {
    this.alertTitle = this.translate.instant('LOGIN.ALERT_TITLE');
    this.alertMessage = message;
    this.isAlertOpen = true;
  }

  private isValidEmail(value: string): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(value.trim());
  }
}
