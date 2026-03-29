import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService, LoginResponse } from './auth.service';
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
});
