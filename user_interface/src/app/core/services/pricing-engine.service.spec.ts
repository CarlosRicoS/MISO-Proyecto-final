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

  it('gets pricing data without optional filters and without authorization token', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PricingEngineService,
        {
          provide: ConfigService,
          useValue: {
            apiBaseUrl: 'https://api.example.com',
            propertyApiPath: '/poc-properties/api/property',
            propertyApiToken: '',
          },
        },
      ],
    });

    const freshService = TestBed.inject(PricingEngineService);
    const freshHttpMock = TestBed.inject(HttpTestingController);

    freshService.getPricingData().subscribe((response) => {
      expect(response.roomTypes).toEqual([{ id: 'rt-1' } as any]);
      expect(response.seasonalRules).toEqual([{ id: 'rule-1' } as any]);
      expect(response.isLoading).toBeFalse();
    });

    const req = freshHttpMock.expectOne((request) =>
      request.url === 'https://api.example.com/poc-properties/api/property'
      && request.params.keys().length === 0
      && request.headers.has('Authorization') === false,
    );

    expect(req.request.method).toBe('GET');
    req.flush({ roomTypes: [{ id: 'rt-1' }], seasonalRules: [{ id: 'rule-1' }] });
    freshHttpMock.verify();
  });

  it('maps getRoomTypes from pricing data', () => {
    service.getRoomTypes({ season: 'low' }).subscribe((roomTypes) => {
      expect(roomTypes.length).toBe(2);
      expect(roomTypes[0].name).toBe('Standard');
    });

    const req = httpMock.expectOne((request) =>
      request.url === 'https://api.example.com/poc-properties/api/property'
      && request.params.get('season') === 'low',
    );

    req.flush({
      roomTypes: [
        { id: 'std', name: 'Standard' },
        { id: 'dlx', name: 'Deluxe' },
      ],
      seasonalRules: [],
    });
  });

  it('maps getSeasonalRules from pricing data', () => {
    service.getSeasonalRules({ currency: 'COP' }).subscribe((rules) => {
      expect(rules.length).toBe(1);
      expect(rules[0].dateRange).toBe('2026-01-01 - 2026-01-31');
    });

    const req = httpMock.expectOne((request) =>
      request.url === 'https://api.example.com/poc-properties/api/property'
      && request.params.get('currency') === 'COP',
    );

    req.flush({
      roomTypes: [],
      seasonalRules: [{ id: 'high-jan', dateRange: '2026-01-01 - 2026-01-31' }],
    });
  });

  it('resolves getPricingDataAsync', async () => {
    const promise = service.getPricingDataAsync({ roomType: 'suite' });

    const req = httpMock.expectOne((request) =>
      request.url === 'https://api.example.com/poc-properties/api/property'
      && request.params.get('roomType') === 'suite',
    );

    req.flush({ roomTypes: [{ id: 'suite-1' }], seasonalRules: [] });

    const result = await promise;
    expect(result.roomTypes.length).toBe(1);
  });

  it('gets pricing engine property price without discount code', () => {
    service.getPricingEnginePropertyPrice({
      propertyId: 'prop-1',
      guests: 1,
      dateInit: '2026-05-01',
      dateFinish: '2026-05-02',
    }).subscribe((response) => {
      expect(response.price).toBe(123000);
    });

    const req = httpMock.expectOne((request) =>
      request.url === 'https://api.example.com/pricing-engine/api/PropertyPrice'
      && request.params.get('discountCode') === null,
    );

    req.flush({ id: 'prop-1', price: 123000 });
  });

  it('updates a pricing record with PUT, base price, property id, and bearer token', () => {
    service.updatePropertyPrice('pricing-1', 'property-1', 175.5).subscribe((response) => {
      expect(response).toEqual({ ok: true });
    });

    const req = httpMock.expectOne('https://api.example.com/pricing-engine/api/propertyprice/pricing/pricing-1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ basePrice: 175.5, PropertyId: 'property-1' });
    expect(req.request.headers.get('Authorization')).toBe('Bearer property-token');

    req.flush({ ok: true });
  });

  it('returns pricing engine result without fallback when engine succeeds', () => {
    service.getPropertyPricing({
      propertyId: 'prop-2',
      guests: 2,
      dateInit: '2026-05-01',
      dateFinish: '2026-05-03',
    }).subscribe((response) => {
      expect(response.name).toBe('Engine Hotel');
      expect(response.price).toBe(300000);
    });

    const engineReq = httpMock.expectOne((request) =>
      request.url === 'https://api.example.com/pricing-engine/api/PropertyPrice'
      && request.params.get('propertyId') === 'prop-2',
    );
    engineReq.flush({ id: 'prop-2', name: 'Engine Hotel', price: 300000 });

    httpMock.expectNone((request) => request.url.includes('/pricing-orchestator/api/Property'));
  });

  it('builds relative URLs when baseUrl is not configured', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PricingEngineService,
        {
          provide: ConfigService,
          useValue: {
            apiBaseUrl: '',
            propertyApiPath: '/poc-properties/api/property',
            propertyApiToken: '',
          },
        },
      ],
    });

    const localService = TestBed.inject(PricingEngineService);
    const localHttpMock = TestBed.inject(HttpTestingController);

    localService.getPricingEngineHealth().subscribe((response) => {
      expect(response.status).toBe('ok');
    });

    const req = localHttpMock.expectOne('/pricing-engine/api/Health');
    expect(req.request.method).toBe('GET');
    req.flush({ status: 'ok' });
    localHttpMock.verify();
  });

  it('covers formatting helper branches', () => {
    const nonStringDateRange = {} as any;

    expect((service as any).normalizeCurrency('  COP ')).toBe('COP');
    expect((service as any).normalizeCurrency('')).toBe('$');

    expect((service as any).formatRate(1500.5, '$')).toBe('$1,500.50');

    expect((service as any).formatDiscount(0)).toBe('No discount');
    expect((service as any).formatDiscount(10)).toBe('+10.00% OFF');
    expect((service as any).formatDiscount(-7.5)).toBe('7.50% OFF');

    expect((service as any).formatDateRange('')).toBe('-');
    expect((service as any).formatDateRange('2026-05-01T12:00:00Z - 2026-05-05T12:00:00Z')).toBe('May 1 - May 5');
    expect((service as any).formatDateRange(nonStringDateRange)).toBe(nonStringDateRange);
  });
});