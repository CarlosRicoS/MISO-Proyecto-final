import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  IonAlert,
  IonButton,
  IonCard,
  IonCardContent,
  IonCol,
  IonContent,
  IonGrid,
  IonRow,
  IonSpinner,
} from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';
import { ThButtonComponent } from '../../shared/components/th-button/th-button.component';
import { ThInputComponent, ThInputState } from '../../shared/components/th-input/th-input.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonCardContent,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonButton,
    IonAlert,
    IonSpinner,
    ThInputComponent,
    ThButtonComponent,
  ],
})
export class LoginPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  hasSubmitted = false;
  isAlertOpen = false;
  alertTitle = '';
  alertMessage = '';
  isLoading = false;

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

  onEmailChange(value: string): void {
    this.email = value;
  }

  onPasswordChange(value: string): void {
    this.password = value;
  }

  async onSignIn(): Promise<void> {
    this.hasSubmitted = true;

    if (this.emailState === 'error' || this.passwordState === 'error') {
      return;
    }

    this.isLoading = true;
    try {
      const response = await firstValueFrom(this.authService.login(this.email.trim(), this.password));

      // Persist tokens for subsequent authenticated requests.
      localStorage.setItem('id_token', response.id_token);
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      localStorage.setItem('expires_in', String(response.expires_in));
      localStorage.setItem('token_type', response.token_type);

      // Navigate to home.
      this.router.navigate(['/home']);
    } catch (error) {
      const httpError = error as HttpErrorResponse;
      if (httpError.status === 401) {
        this.showErrorAlert('Invalid email or password.');
      } else {
        this.showErrorAlert('An error occurred. Please try again.');
      }
    } finally {
      this.isLoading = false;
    }
  }

  private showErrorAlert(message: string): void {
    this.alertTitle = 'Login Failed';
    this.alertMessage = message;
    this.isAlertOpen = true;
  }

  private isValidEmail(value: string): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(value.trim());
  }
}
