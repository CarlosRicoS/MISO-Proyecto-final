import { Injectable } from '@angular/core';

export interface LoginResponse {
  success: boolean;
  message?: string;
  token?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor() {}

  login(email: string, password: string): Promise<LoginResponse> {
    return new Promise((resolve) => {
      // Simulate API delay
      setTimeout(() => {
        // Mock validation: reject invalid credentials
        if (email === 'test@example.com' && password === 'password123') {
          resolve({
            success: true,
            token: 'mock-jwt-token'
          });
        } else {
          resolve({
            success: false,
            message: 'Invalid email or password. Try test@example.com / password123'
          });
        }
      }, 500);
    });
  }
}
