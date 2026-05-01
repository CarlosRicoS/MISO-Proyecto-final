/// <reference types="jasmine" />

import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ConfigService } from './config.service';
import { PricingEngineService } from './pricing-engine.service';

describe('PricingEngineService', () => {
  let service: PricingEngineService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PricingEngineService,
        {
          provide: ConfigService,
          useValue: {
            apiBaseUrl: 'https://api.example.com',
            propertyApiPath: '/poc-properties/api/property',
            propertyApiToken: 'property-token',
          },
        },
      ],
    });

    service = TestBed.inject(PricingEngineService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('gets pricing engine health', () => {
    service.getPricingEngineHealth().subscribe((response) => {
      expect(response.status).toBe('ok');
    });

    const req = httpMock.expectOne('https://api.example.com/pricing-engine/api/Health');
    expect(req.request.method).toBe('GET');

    req.flush({ status: 'ok', service: 'pricing-engine' });
  });

  it('gets pricing engine property price with query params', () => {
    service.getPricingEnginePropertyPrice({
      propertyId: '7b2f2f2f-8a9b-4f25-ae6d-1d2a1f0c1c33',
      guests: 2,
      dateInit: '2026-05-10',
      dateFinish: '2026-05-12',
      discountCode: 'SPRING',
    }).subscribe((response) => {
      expect(response.price).toBe(560000);
    });

    const req = httpMock.expectOne((request) => {
      return request.url === 'https://api.example.com/pricing-engine/api/PropertyPrice'
        && request.params.get('propertyId') === '7b2f2f2f-8a9b-4f25-ae6d-1d2a1f0c1c33'
        && request.params.get('guests') === '2'
        && request.params.get('dateInit') === '2026-05-10'
        && request.params.get('dateFinish') === '2026-05-12'
        && request.params.get('discountCode') === 'SPRING';
    });

    expect(req.request.method).toBe('GET');
    req.flush({ id: '7b2f2f2f-8a9b-4f25-ae6d-1d2a1f0c1c33', price: 560000 });
  });

  it('gets pricing orchestrator health', () => {
    service.getPricingOrchestratorHealth().subscribe((response) => {
      expect(response.status).toBe('ok');
    });

    const req = httpMock.expectOne('https://api.example.com/pricing-orchestator/api/Health');
    expect(req.request.method).toBe('GET');

    req.flush({ status: 'ok', service: 'pricing-orchestator' });
  });

  it('gets pricing orchestrator property with query params', () => {
    service.getPricingOrchestratorProperty({
      propertyId: '7b2f2f2f-8a9b-4f25-ae6d-1d2a1f0c1c33',
      guests: 4,
      dateInit: '2026-06-01',
      dateFinish: '2026-06-03',
    }).subscribe((response) => {
      expect(response.name).toBe('Hotel Aurora');
      expect(response.price).toBe(420000);
    });

    const req = httpMock.expectOne((request) => {
      return request.url === 'https://api.example.com/pricing-orchestator/api/Property'
        && request.params.get('propertyId') === '7b2f2f2f-8a9b-4f25-ae6d-1d2a1f0c1c33'
        && request.params.get('guests') === '4'
        && request.params.get('dateInit') === '2026-06-01'
        && request.params.get('dateFinish') === '2026-06-03';
    });

    expect(req.request.method).toBe('GET');
    req.flush({
      id: '7b2f2f2f-8a9b-4f25-ae6d-1d2a1f0c1c33',
      name: 'Hotel Aurora',
      maxCapacity: 4,
      description: 'Modern hotel near the historic center.',
      urlBucketPhotos: 'https://picsum.photos/seed/aurora-hero/1200/800',
      checkInTime: '15:00:00',
      checkOutTime: '11:00:00',
      adminGroupId: 'hotel-admins',
      price: 420000,
    });
  });

  it('gets pricing property with fallback to orchestrator', () => {
    service.getPropertyPricing({
      propertyId: '7b2f2f2f-8a9b-4f25-ae6d-1d2a1f0c1c33',
      guests: 2,
      dateInit: '2026-05-10',
      dateFinish: '2026-05-12',
    }).subscribe((response) => {
      expect(response.price).toBe(560000);
    });

    const engineReq = httpMock.expectOne((request) => {
      return request.url === 'https://api.example.com/pricing-engine/api/PropertyPrice'
        && request.params.get('propertyId') === '7b2f2f2f-8a9b-4f25-ae6d-1d2a1f0c1c33'
        && request.params.get('guests') === '2'
        && request.params.get('dateInit') === '2026-05-10'
        && request.params.get('dateFinish') === '2026-05-12';
    });
    expect(engineReq.request.method).toBe('GET');
    engineReq.flush('engine unavailable', {
      status: 500,
      statusText: 'Server Error',
    });

    const orchestratorReq = httpMock.expectOne((request) => {
      return request.url === 'https://api.example.com/pricing-orchestator/api/Property'
        && request.params.get('propertyId') === '7b2f2f2f-8a9b-4f25-ae6d-1d2a1f0c1c33'
        && request.params.get('guests') === '2'
        && request.params.get('dateInit') === '2026-05-10'
        && request.params.get('dateFinish') === '2026-05-12';
    });
    expect(orchestratorReq.request.method).toBe('GET');
    orchestratorReq.flush({
      id: '7b2f2f2f-8a9b-4f25-ae6d-1d2a1f0c1c33',
      name: 'Fallback Hotel',
      price: 560000,
    });
  });

  it('gets legacy pricing data from the configured property path', () => {
    service.getPricingData({
      roomType: 'suite',
      currency: 'USD',
      season: 'high',
    }).subscribe((response) => {
      expect(response.roomTypes).toEqual([]);
      expect(response.seasonalRules).toEqual([]);
    });

    const req = httpMock.expectOne((request) => {
      return request.url === 'https://api.example.com/poc-properties/api/property'
        && request.params.get('roomType') === 'suite'
        && request.params.get('currency') === 'USD'
        && request.params.get('season') === 'high'
        && request.headers.get('Authorization') === 'Bearer property-token';
    });

    expect(req.request.method).toBe('GET');
    req.flush({ roomTypes: [], seasonalRules: [] });
  });
});