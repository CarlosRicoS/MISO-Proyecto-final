import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ConfigService } from './config.service';

describe('ConfigService', () => {
  let service: ConfigService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ConfigService],
    });

    service = TestBed.inject(ConfigService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads config and exposes values', async () => {
    const loadPromise = service.load();
    const req = httpMock.expectOne('/assets/config.json');
    req.flush({
      apiBaseUrl: 'https://api.example.com',
      propertyApiPath: '/custom-path',
      propertyApiToken: 'token',
      bookingApiPath: '/booking/custom',
    });

    await loadPromise;

    expect(service.apiBaseUrl).toBe('https://api.example.com');
    expect(service.propertyApiPath).toBe('/custom-path');
    expect(service.propertyApiToken).toBe('token');
    expect(service.bookingApiPath).toBe('/booking/custom');
  });

  it('falls back to defaults when optional values are missing', async () => {
    const loadPromise = service.load();
    const req = httpMock.expectOne('/assets/config.json');
    req.flush({
      apiBaseUrl: 'https://api.example.com',
    });

    await loadPromise;

    expect(service.propertyApiPath).toBe('/poc-properties/api/property');
    expect(service.propertyApiToken).toBe('');
    expect(service.bookingApiPath).toBe('/booking-orchestrator/api/reservations');
  });
});
