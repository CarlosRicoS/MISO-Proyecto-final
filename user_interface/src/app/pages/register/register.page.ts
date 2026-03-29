import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ThButtonComponent } from '../../shared/components/th-button/th-button.component';
import {
  ThInputComponent,
  ThInputState,
  ThInputType,
} from '../../shared/components/th-input/th-input.component';

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
  ],
})
export class RegisterPage {
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  acceptedTerms = false;
  hasSubmitted = false;
  isPasswordVisible = false;
  isConfirmPasswordVisible = false;

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

  onCreateAccount(): void {
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

    // Register service integration will be added later.
  }

  private isValidEmail(value: string): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(value.trim());
  }

}
