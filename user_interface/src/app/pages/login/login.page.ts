import { Component, inject } from '@angular/core';
import {
  IonAlert,
  IonButton,
  IonCard,
  IonCardContent,
  IonCol,
  IonContent,
  IonGrid,
  IonRow,
} from '@ionic/angular/standalone';
import { ThInputState } from 'src/app/shared/components/th-input/th-input.component';
import { SharedModule } from '../../shared/shared.module';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [
    IonCardContent,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonButton,
    IonAlert,
    SharedModule,
  ],
})
export class LoginPage {
  private readonly authService = inject(AuthService);

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

  onSignIn(): void {
    this.hasSubmitted = true;

    if (this.emailState === 'error' || this.passwordState === 'error') {
      return;
    }

    this.isLoading = true;
    this.authService.login(this.email.trim(), this.password).then((response) => {
      this.isLoading = false;

      if (response.success) {
        // Navigate to home or dashboard
        console.log('Login successful:', response.token);
      } else {
        this.showErrorAlert(response.message || 'Login failed. Please try again.');
      }
    }).catch((error) => {
      this.isLoading = false;
      this.showErrorAlert('An error occurred. Please try again.');
    });
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
