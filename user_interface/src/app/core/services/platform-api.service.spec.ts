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
});
