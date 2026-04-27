import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ConfigService } from './config.service';
import { PlatformApiService } from './platform-api.service';

describe('PlatformApiService', () => {
  let service: PlatformApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PlatformApiService,
        {
          provide: ConfigService,
          useValue: {
            apiBaseUrl: 'https://api.example.com',
          },
        },
      ],
    });

    service = TestBed.inject(PlatformApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('gets booking orchestrator health', () => {
    service.getBookingOrchestratorHealth().subscribe((response) => {
      expect(response.status).toBe('healthy');
    });

    const req = httpMock.expectOne('https://api.example.com/booking-orchestrator/api/health');
    expect(req.request.method).toBe('GET');

    req.flush({ status: 'healthy' });
  });

  it('posts lock property request to pms endpoint', () => {
    const payload = {
      property_id: 'prop-1',
      start_date: '2026-05-01',
      end_date: '2026-05-03',
      user_id: 'user-1',
    };

    service.lockPropertyViaPms(payload).subscribe((response) => {
      expect(response.status).toBe('locked');
    });

    const req = httpMock.expectOne('https://api.example.com/pms/api/pms/lock-property');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);

    req.flush({ status: 'locked', message: 'Property locked successfully' });
  });

  it('gets pricing engine property price with query params', () => {
    service.getPricingEnginePropertyPrice({
      propertyId: '7b2f2f2f-8a9b-4f25-ae6d-1d2a1f0c1c33',
      guests: 2,
      dateInit: '2026-05-10',
      dateFinish: '2026-05-12',
      discountCode: 'SPRING',
    }).subscribe();

    const req = httpMock.expectOne((request) => {
      return request.url === 'https://api.example.com/pricing-engine/api/PropertyPrice'
        && request.params.get('propertyId') === '7b2f2f2f-8a9b-4f25-ae6d-1d2a1f0c1c33'
        && request.params.get('guests') === '2'
        && request.params.get('dateInit') === '2026-05-10'
        && request.params.get('dateFinish') === '2026-05-12'
        && request.params.get('discountCode') === 'SPRING';
    });

    expect(req.request.method).toBe('GET');
    req.flush({ price: 560000 });
  });

  describe('buildUrl', () => {
    it('prepends baseUrl when it is defined', () => {
      service.getPricingEnginePropertyPrice({
        propertyId: 'prop-1',
        guests: 2,
        dateInit: '2026-05-10',
        dateFinish: '2026-05-12',
      }).subscribe();

      const req = httpMock.expectOne((request) => {
        return request.url === 'https://api.example.com/pricing-engine/api/PropertyPrice'
          && request.params.get('propertyId') === 'prop-1'
          && request.params.get('guests') === '2'
          && request.params.get('dateInit') === '2026-05-10'
          && request.params.get('dateFinish') === '2026-05-12';
      });

      expect(req.request.method).toBe('GET');
      req.flush({ price: 100000 });
    });

    it('normalizes path by removing leading slash', () => {
      service.getBookingOrchestratorHealth().subscribe();

      const req = httpMock.expectOne('https://api.example.com/booking-orchestrator/api/health');
      expect(req.request.url).toBe('https://api.example.com/booking-orchestrator/api/health');
      req.flush({ status: 'healthy' });
    });

    it('normalizes baseUrl by removing trailing slash', () => {
      // Test the logic indirectly by verifying double slashes are not created
      service.getPricingEngineHealth().subscribe();

      const req = httpMock.expectOne('https://api.example.com/pricing-engine/api/Health');
      // Should not have double slash between baseUrl and path
      expect(req.request.url).not.toContain('//pricing');
      req.flush({ status: 'healthy' });
    });
  });

  describe('buildPropertyPriceParams', () => {
    it('includes discountCode in params when provided', () => {
      service.getPricingEnginePropertyPrice({
        propertyId: 'prop-1',
        guests: 2,
        dateInit: '2026-05-10',
        dateFinish: '2026-05-12',
        discountCode: 'DISCOUNT20',
      }).subscribe();

      const req = httpMock.expectOne((request) => {
        return request.url.includes('pricing-engine/api/PropertyPrice')
          && request.params.get('discountCode') === 'DISCOUNT20';
      });

      expect(req.request.params.get('discountCode')).toBe('DISCOUNT20');
      req.flush({ price: 100000 });
    });

    it('excludes discountCode from params when not provided', () => {
      service.getPricingEnginePropertyPrice({
        propertyId: 'prop-1',
        guests: 2,
        dateInit: '2026-05-10',
        dateFinish: '2026-05-12',
      }).subscribe();

      const req = httpMock.expectOne((request) => {
        return request.url.includes('pricing-engine/api/PropertyPrice');
      });

      expect(req.request.params.has('discountCode')).toBeFalse();
      req.flush({ price: 100000 });
    });

    it('correctly sets all required params', () => {
      service.getPricingEnginePropertyPrice({
        propertyId: 'prop-123',
        guests: 5,
        dateInit: '2026-06-01',
        dateFinish: '2026-06-05',
      }).subscribe();

      const req = httpMock.expectOne((request) => {
        return request.url.includes('pricing-engine/api/PropertyPrice')
          && request.params.get('propertyId') === 'prop-123'
          && request.params.get('guests') === '5'
          && request.params.get('dateInit') === '2026-06-01'
          && request.params.get('dateFinish') === '2026-06-05';
      });

      expect(req.request.params.get('propertyId')).toBe('prop-123');
      expect(req.request.params.get('guests')).toBe('5');
      req.flush({ price: 250000 });
    });
  });

  describe('all health check endpoints', () => {
    it('calls auth health endpoint', () => {
      service.getAuthHealth().subscribe();

      const req = httpMock.expectOne((request) => {
        return request.url.includes('auth/api/health');
      });

      expect(req.request.method).toBe('GET');
      req.flush({ status: 'healthy' });
    });

    it('calls pricing engine health endpoint', () => {
      service.getPricingEngineHealth().subscribe();

      const req = httpMock.expectOne((request) => {
        return request.url.includes('pricing-engine/api/Health');
      });

      expect(req.request.method).toBe('GET');
      req.flush({ status: 'healthy' });
    });

    it('calls pricing orchestrator property endpoint', () => {
      service.getPricingOrchestratorProperty({
        propertyId: 'prop-1',
        guests: 2,
        dateInit: '2026-05-10',
        dateFinish: '2026-05-12',
      }).subscribe();

      const req = httpMock.expectOne((request) => {
        return request.url.includes('pricing-orchestator/api/Property');
      });

      expect(req.request.method).toBe('GET');
      req.flush({ price: 150000 });
    });

    it('calls pricing orchestrator health endpoint', () => {
      service.getPricingOrchestratorHealth().subscribe();

      const req = httpMock.expectOne((request) => {
        return request.url.includes('pricing-orchestator/api/Health');
      });

      expect(req.request.method).toBe('GET');
      req.flush({ status: 'healthy' });
    });

    it('calls pms health endpoint', () => {
      service.getPmsHealth().subscribe();

      const req = httpMock.expectOne((request) => {
        return request.url.includes('pms/api/health');
      });

      expect(req.request.method).toBe('GET');
      req.flush({ status: 'healthy' });
    });
  });
});
