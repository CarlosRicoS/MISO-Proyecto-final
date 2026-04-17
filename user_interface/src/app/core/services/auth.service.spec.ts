import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthMeResponse, AuthService, LoginResponse, RegisterResponse } from './auth.service';
import { ConfigService } from './config.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let configService: ConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService, ConfigService],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    configService = TestBed.inject(ConfigService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('login', () => {
    it('should make a POST request to the login endpoint', () => {
      const email = 'test@example.com';
      const password = 'password123';
      const mockResponse: LoginResponse = {
        id_token: 'id_token_value',
        access_token: 'access_token_value',
        refresh_token: 'refresh_token_value',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      service.login(email, password).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('/auth/api/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email, password });
      expect(req.request.headers.get('Content-Type')).toBe('application/json');

      req.flush(mockResponse);
    });

    it('should use custom API base URL when available', () => {
      const email = 'test@example.com';
      const password = 'password123';
      spyOnProperty(configService, 'apiBaseUrl', 'get').and.returnValue('https://api.example.com');

      const mockResponse: LoginResponse = {
        id_token: 'id_token_value',
        access_token: 'access_token_value',
        refresh_token: 'refresh_token_value',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      service.login(email, password).subscribe();

      const req = httpMock.expectOne('https://api.example.com/auth/api/auth/login');
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should handle trailing slash in API base URL', () => {
      const email = 'test@example.com';
      const password = 'password123';
      spyOnProperty(configService, 'apiBaseUrl', 'get').and.returnValue('https://api.example.com/');

      const mockResponse: LoginResponse = {
        id_token: 'id_token_value',
        access_token: 'access_token_value',
        refresh_token: 'refresh_token_value',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      service.login(email, password).subscribe();

      const req = httpMock.expectOne('https://api.example.com/auth/api/auth/login');
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should return login response with all tokens', (done) => {
      const email = 'user@example.com';
      const password = 'securepass';
      const mockResponse: LoginResponse = {
        id_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        refresh_token: 'refresh_token_xyz',
        expires_in: 7200,
        token_type: 'Bearer',
      };

      service.login(email, password).subscribe((response) => {
        expect(response.id_token).toBe(mockResponse.id_token);
        expect(response.access_token).toBe(mockResponse.access_token);
        expect(response.refresh_token).toBe(mockResponse.refresh_token);
        expect(response.expires_in).toBe(7200);
        expect(response.token_type).toBe('Bearer');
        done();
      },
      (error) => {
        fail('Request should not have failed: ' + JSON.stringify(error));
        done();
      });

      const req = httpMock.expectOne('/auth/api/auth/login');
      req.flush(mockResponse);
    });

    it('should emit error on 401 unauthorized response', (done) => {
      const email = 'test@example.com';
      const password = 'wrongpassword';

      service.login(email, password).subscribe(
        () => {
          fail('should have failed with 401 error');
        },
        (error) => {
          expect(error.status).toBe(401);
          done();
        }
      );

      const req = httpMock.expectOne('/auth/api/auth/login');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should emit error on 500 server error', (done) => {
      const email = 'test@example.com';
      const password = 'password123';

      service.login(email, password).subscribe(
        () => {
          fail('should have failed with 500 error');
        },
        (error) => {
          expect(error.status).toBe(500);
          done();
        }
      );

      const req = httpMock.expectOne('/auth/api/auth/login');
      req.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should send correct headers with request', () => {
      const email = 'test@example.com';
      const password = 'password123';
      const mockResponse: LoginResponse = {
        id_token: 'id_token_value',
        access_token: 'access_token_value',
        refresh_token: 'refresh_token_value',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      service.login(email, password).subscribe();

      const req = httpMock.expectOne('/auth/api/auth/login');
      expect(req.request.headers.has('Content-Type')).toBe(true);
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      req.flush(mockResponse);
    });

    it('should send email and password in request body', () => {
      const email = 'newuser@test.com';
      const password = 'secretpass456';
      const mockResponse: LoginResponse = {
        id_token: 'token1',
        access_token: 'token2',
        refresh_token: 'token3',
        expires_in: 7200,
        token_type: 'Bearer',
      };

      service.login(email, password).subscribe();

      const req = httpMock.expectOne('/auth/api/auth/login');
      expect(req.request.body.email).toBe(email);
      expect(req.request.body.password).toBe(password);
      req.flush(mockResponse);
    });

    it('should handle network error', (done) => {
      const email = 'test@example.com';
      const password = 'password123';

      service.login(email, password).subscribe(
        () => {
          fail('should have failed with network error');
        },
        (error) => {
          expect(error).toBeDefined();
          done();
        }
      );

      const req = httpMock.expectOne('/auth/api/auth/login');
      req.error(new ErrorEvent('Network error'));
    });

    it('should handle empty response', (done) => {
      const email = 'test@example.com';
      const password = 'password123';

      service.login(email, password).subscribe(
        () => {
          fail('should have failed with empty response');
        },
        (error) => {
          expect(error).toBeDefined();
          done();
        }
      );

      const req = httpMock.expectOne('/auth/api/auth/login');
      req.error(new ErrorEvent('Empty response'));
    });

    it('should handle different token expirations', (done) => {
      const email = 'test@example.com';
      const password = 'password123';
      const mockResponse: LoginResponse = {
        id_token: 'id_token_value',
        access_token: 'access_token_value',
        refresh_token: 'refresh_token_value',
        expires_in: 86400, // 24 hours
        token_type: 'Bearer',
      };

      service.login(email, password).subscribe((response) => {
        expect(response.expires_in).toBe(86400);
        done();
      },
      (error) => {
        fail('Request should not have failed: ' + JSON.stringify(error));
        done();
      });

      const req = httpMock.expectOne('/auth/api/auth/login');
      req.flush(mockResponse);
    });

    it('should handle Bearer token type', (done) => {
      const email = 'test@example.com';
      const password = 'password123';
      const mockResponse: LoginResponse = {
        id_token: 'id_token_value',
        access_token: 'access_token_value',
        refresh_token: 'refresh_token_value',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      service.login(email, password).subscribe((response) => {
        expect(response.token_type).toBe('Bearer');
        done();
      });

      const req = httpMock.expectOne('/auth/api/auth/login');
      req.flush(mockResponse);
    });
  });

  describe('register', () => {
    it('should make a POST request to the register endpoint', () => {
      const fullName = 'Juan Perez';
      const email = 'juan@example.com';
      const password = 'MyPass123';
      const mockResponse: RegisterResponse = {
        message: 'User registered successfully',
        email,
        role: 'travelers',
      };

      service.register(fullName, email, password).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('/auth/api/auth/register');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        full_name: fullName,
        email,
        password,
        role: 'travelers',
      });
      expect(req.request.headers.get('Content-Type')).toBe('application/json');

      req.flush(mockResponse);
    });

    it('should use custom API base URL for register when available', () => {
      spyOnProperty(configService, 'apiBaseUrl', 'get').and.returnValue('https://api.example.com/');

      service.register('Juan Perez', 'juan@example.com', 'MyPass123').subscribe();

      const req = httpMock.expectOne('https://api.example.com/auth/api/auth/register');
      expect(req.request.method).toBe('POST');
      req.flush({
        message: 'User registered successfully',
        email: 'juan@example.com',
        role: 'travelers',
      });
    });

    it('should emit error on 409 conflict response', (done) => {
      service.register('Juan Perez', 'juan@example.com', 'MyPass123').subscribe(
        () => {
          fail('should have failed with 409 error');
        },
        (error) => {
          expect(error.status).toBe(409);
          expect(error.error.detail).toBe('Email already in use');
          done();
        }
      );

      const req = httpMock.expectOne('/auth/api/auth/register');
      req.flush({ detail: 'Email already in use' }, { status: 409, statusText: 'Conflict' });
    });

    it('should emit error on 400 bad request response', (done) => {
      service.register('Juan Perez', 'juan@example.com', 'weak').subscribe(
        () => {
          fail('should have failed with 400 error');
        },
        (error) => {
          expect(error.status).toBe(400);
          expect(error.error.detail).toBe('Password does not meet criteria');
          done();
        }
      );

      const req = httpMock.expectOne('/auth/api/auth/register');
      req.flush({ detail: 'Password does not meet criteria' }, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('me', () => {
    it('should make a GET request to the me endpoint with Bearer token', () => {
      const token = 'access-token-123';
      const mockResponse: AuthMeResponse = {
        user_id: 'user-123',
        email: 'traveler@example.com',
        email_verified: true,
        role: 'travelers',
      };

      service.me(token).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('/auth/api/auth/me');
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer access-token-123');
      req.flush(mockResponse);
    });

    it('should use custom API base URL for me endpoint', () => {
      spyOnProperty(configService, 'apiBaseUrl', 'get').and.returnValue('https://api.example.com/');

      service.me('token-xyz').subscribe();

      const req = httpMock.expectOne('https://api.example.com/auth/api/auth/me');
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer token-xyz');
      req.flush({
        user_id: 'user-1',
        email: 'user@example.com',
        email_verified: true,
        role: 'travelers',
      } satisfies AuthMeResponse);
    });
  });
});
