import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PricingService } from './pricing.service';
import { ConfigService } from './config.service';
import { PricingOrchestratorResponse } from '../models/pricing.model';

class ConfigServiceStub {
  private _apiBaseUrl = 'https://api.example.com';
  private _pricingOrchestratorApiPath = '/pricing-orchestator/api/Property';

  get apiBaseUrl(): string {
    return this._apiBaseUrl;
  }

  get pricingOrchestratorApiPath(): string {
    return this._pricingOrchestratorApiPath;
  }
}

describe('PricingService', () => {
  let service: PricingService;
  let httpMock: HttpTestingController;
  let configService: ConfigService;

  const mockResponse: PricingOrchestratorResponse = {
    id: 'prop-1',
    name: 'Hotel Aurora',
    maxCapacity: 4,
    description: 'A nice hotel',
    urlBucketPhotos: 'https://photos.example.com/1.jpg',
    checkInTime: '14:00:00',
    checkOutTime: '12:00:00',
    adminGroupId: 'hotel-admins',
    price: 350,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PricingService,
        { provide: ConfigService, useClass: ConfigServiceStub },
      ],
    });

    service = TestBed.inject(PricingService);
    httpMock = TestBed.inject(HttpTestingController);
    configService = TestBed.inject(ConfigService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('builds GET request with correct URL and required query params', () => {
    service.getPropertyWithPrice({
      propertyId: 'prop-1',
      guests: 2,
      dateInit: '2026-05-01',
      dateFinish: '2026-05-03',
    }).subscribe((response) => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne((request) =>
      request.url === 'https://api.example.com/pricing-orchestator/api/Property',
    );

    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('propertyId')).toBe('prop-1');
    expect(req.request.params.get('guests')).toBe('2');
    expect(req.request.params.get('dateInit')).toBe('2026-05-01');
    expect(req.request.params.get('dateFinish')).toBe('2026-05-03');
    expect(req.request.params.has('discountCode')).toBe(false);

    req.flush(mockResponse);
  });

  it('includes discountCode query param when provided', () => {
    service.getPropertyWithPrice({
      propertyId: 'prop-1',
      guests: 1,
      dateInit: '2026-06-01',
      dateFinish: '2026-06-05',
      discountCode: 'SUMMER20',
    }).subscribe();

    const req = httpMock.expectOne((request) =>
      request.url === 'https://api.example.com/pricing-orchestator/api/Property',
    );

    expect(req.request.params.get('discountCode')).toBe('SUMMER20');
    req.flush(mockResponse);
  });

  it('does not include discountCode when it is undefined', () => {
    service.getPropertyWithPrice({
      propertyId: 'prop-1',
      guests: 1,
      dateInit: '2026-06-01',
      dateFinish: '2026-06-05',
      discountCode: undefined,
    }).subscribe();

    const req = httpMock.expectOne(() => true);
    expect(req.request.params.has('discountCode')).toBe(false);
    req.flush(mockResponse);
  });

  it('does not include discountCode when it is empty string', () => {
    service.getPropertyWithPrice({
      propertyId: 'prop-1',
      guests: 1,
      dateInit: '2026-06-01',
      dateFinish: '2026-06-05',
      discountCode: '',
    }).subscribe();

    const req = httpMock.expectOne(() => true);
    expect(req.request.params.has('discountCode')).toBe(false);
    req.flush(mockResponse);
  });

  it('propagates HTTP error to subscriber', () => {
    let errorResponse: any;

    service.getPropertyWithPrice({
      propertyId: 'prop-1',
      guests: 1,
      dateInit: '2026-06-01',
      dateFinish: '2026-06-05',
    }).subscribe({
      error: (err) => {
        errorResponse = err;
      },
    });

    const req = httpMock.expectOne(() => true);
    req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });

    expect(errorResponse).toBeTruthy();
    expect(errorResponse.status).toBe(400);
  });

  it('propagates 502 error from upstream failure', () => {
    let errorResponse: any;

    service.getPropertyWithPrice({
      propertyId: 'prop-1',
      guests: 1,
      dateInit: '2026-06-01',
      dateFinish: '2026-06-05',
    }).subscribe({
      error: (err) => {
        errorResponse = err;
      },
    });

    const req = httpMock.expectOne(() => true);
    req.flush('Bad Gateway', { status: 502, statusText: 'Bad Gateway' });

    expect(errorResponse).toBeTruthy();
    expect(errorResponse.status).toBe(502);
  });

  it('handles empty apiBaseUrl by using relative path', () => {
    spyOnProperty(configService, 'apiBaseUrl', 'get').and.returnValue('');

    service.getPropertyWithPrice({
      propertyId: 'prop-2',
      guests: 1,
      dateInit: '2026-06-01',
      dateFinish: '2026-06-02',
    }).subscribe();

    const req = httpMock.expectOne((request) =>
      request.url === '/pricing-orchestator/api/Property',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('strips leading slash from pricing path before constructing URL', () => {
    spyOnProperty(configService, 'pricingOrchestratorApiPath', 'get').and.returnValue('/pricing-orchestator/api/Property');

    service.getPropertyWithPrice({
      propertyId: 'prop-3',
      guests: 1,
      dateInit: '2026-06-01',
      dateFinish: '2026-06-02',
    }).subscribe();

    const req = httpMock.expectOne((request) =>
      request.url === 'https://api.example.com/pricing-orchestator/api/Property',
    );
    req.flush(mockResponse);
  });

  it('strips trailing slash from base URL', () => {
    spyOnProperty(configService, 'apiBaseUrl', 'get').and.returnValue('https://api.example.com/');

    service.getPropertyWithPrice({
      propertyId: 'prop-4',
      guests: 1,
      dateInit: '2026-06-01',
      dateFinish: '2026-06-02',
    }).subscribe();

    const req = httpMock.expectOne((request) =>
      request.url === 'https://api.example.com/pricing-orchestator/api/Property',
    );
    req.flush(mockResponse);
  });

  it('falls back to default path when pricingOrchestratorApiPath is empty', () => {
    spyOnProperty(configService, 'pricingOrchestratorApiPath', 'get').and.returnValue('');

    service.getPropertyWithPrice({
      propertyId: 'prop-5',
      guests: 1,
      dateInit: '2026-06-01',
      dateFinish: '2026-06-02',
    }).subscribe();

    const req = httpMock.expectOne((request) =>
      request.url === 'https://api.example.com/pricing-orchestator/api/Property',
    );
    req.flush(mockResponse);
  });

  it('converts guests number to string in query params', () => {
    service.getPropertyWithPrice({
      propertyId: 'prop-1',
      guests: 10,
      dateInit: '2026-06-01',
      dateFinish: '2026-06-02',
    }).subscribe();

    const req = httpMock.expectOne(() => true);
    expect(req.request.params.get('guests')).toBe('10');
    req.flush(mockResponse);
  });
});
