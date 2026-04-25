import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HotelsService } from './hotels.service';
import { ConfigService } from './config.service';
import { PricingService } from './pricing.service';
import { of, throwError } from 'rxjs';

class ConfigServiceStub {
  private _apiBaseUrl = 'https://api.example.com';
  private _propertyApiPath = '/poc-properties/api/property';
  private _propertyApiToken = 'token';
  private _pricingOrchestratorApiPath = '/pricing-orchestator/api/Property';

  get apiBaseUrl(): string {
    return this._apiBaseUrl;
  }

  get propertyApiPath(): string {
    return this._propertyApiPath;
  }

  get propertyApiToken(): string {
    return this._propertyApiToken;
  }

  get pricingOrchestratorApiPath(): string {
    return this._pricingOrchestratorApiPath;
  }
}

class PricingServiceMock {
  getPropertyWithPrice = jasmine.createSpy('getPropertyWithPrice').and.callFake((params: { propertyId: string }) => {
    return of({ price: 100 });
  });
}

describe('HotelsService', () => {
  let service: HotelsService;
  let httpMock: HttpTestingController;
  let configService: ConfigService;
  let pricingService: PricingServiceMock;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        HotelsService,
        { provide: ConfigService, useClass: ConfigServiceStub },
        { provide: PricingService, useClass: PricingServiceMock },
      ],
    });

    service = TestBed.inject(HotelsService);
    httpMock = TestBed.inject(HttpTestingController);
    configService = TestBed.inject(ConfigService);
    pricingService = TestBed.inject(PricingService) as unknown as PricingServiceMock;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('builds request with query params and auth header', () => {
    service.getHotels({
      startDate: '2026-03-01',
      endDate: '2026-03-02',
      city: 'Paris',
      capacity: 2,
    }).subscribe((hotels) => {
      expect(hotels.length).toBe(1);
      expect(hotels[0].city).toBe('Paris');
      expect(hotels[0].pricePerNight).toBe(120);
    });

    const req = httpMock.expectOne((request) => request.url === 'https://api.example.com/poc-properties/api/property');
    expect(req.request.params.get('startDate')).toBe('2026-03-01');
    expect(req.request.params.get('endDate')).toBe('2026-03-02');
    expect(req.request.params.get('city')).toBe('Paris');
    expect(req.request.params.get('capacity')).toBe('2');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token');

    req.flush([
      {
        id: '1',
        name: 'Hotel Alpha',
        pricePerNight: 120,
        rating: 4.3,
      }
    ]);
  });

  it('requests without params when filters are empty', () => {
    service.getHotels().subscribe((hotels) => {
      expect(hotels.length).toBe(1);
      expect(hotels[0].city).toBe('');
    });

    const req = httpMock.expectOne((request) => request.url === 'https://api.example.com/poc-properties/api/property');
    expect(req.request.params.keys().length).toBe(0);

    req.flush([
      {
        id: '2',
        name: 'Hotel Beta',
      }
    ]);
  });

  it('maps fallback fields when API data is missing', () => {
    service.getHotels({ city: 'Quito' }).subscribe((hotels) => {
      expect(hotels.length).toBe(1);
      expect(hotels[0].name).toBe('Hotel');
      expect(hotels[0].city).toBe('Quito');
      expect(hotels[0].pricePerNight).toBe(140);
      expect(hotels[0].currency).toBe('$');
      expect(hotels[0].rating).toBe(0);
      expect(hotels[0].photos[0]).toBe('https://img.example.com/1.jpg');
    });

    const req = httpMock.expectOne((request) => request.url === 'https://api.example.com/poc-properties/api/property');
    expect(req.request.params.get('city')).toBe('Quito');

    req.flush([
      {
        id: '3',
        price: 140,
        rating: NaN,
        urlBucketPhotos: 'https://img.example.com/1.jpg',
      }
    ]);
  });

  it('uses photos array from API when present', () => {
    service.getHotels().subscribe((hotels) => {
      expect(hotels[0].photos).toEqual([
        'https://img.example.com/1.jpg',
        'https://img.example.com/2.jpg',
      ]);
    });

    const req = httpMock.expectOne(() => true);
    req.flush([
      {
        id: '9',
        photos: [
          'https://img.example.com/1.jpg',
          'https://img.example.com/2.jpg',
        ],
      },
    ]);
  });

  it('handles API without trailing slash', () => {
    spyOnProperty(configService, 'apiBaseUrl', 'get').and.returnValue('https://api.example.com');
    spyOnProperty(configService, 'propertyApiPath', 'get').and.returnValue('poc-properties/api/property');

    service.getHotels().subscribe();

    const req = httpMock.expectOne('https://api.example.com/poc-properties/api/property');
    req.flush([]);
  });

  it('handles empty baseUrl and uses default path', () => {
    spyOnProperty(configService, 'apiBaseUrl', 'get').and.returnValue('');
    spyOnProperty(configService, 'propertyApiPath', 'get').and.returnValue('poc-properties/api/property');

    service.getHotels().subscribe();

    const req = httpMock.expectOne('/poc-properties/api/property');
    req.flush([]);
  });

  it('handles property with all fields populated', () => {
    service.getHotels().subscribe((hotels) => {
      expect(hotels[0].pricePerNight).toBe(150);
      expect(hotels[0].rating).toBe(4.5);
    });

    const req = httpMock.expectOne(() => true);
    req.flush([{
      id: '1',
      name: 'Full Hotel',
      city: 'Paris',
      country: 'France',
      price: 150,
      rating: 4.5,
      imageUrl: 'https://example.com/photo.jpg',
    }]);
  });

  it('prioritizes pricePerNight over price', () => {
    service.getHotels().subscribe((hotels) => {
      expect(hotels[0].pricePerNight).toBe(200);
    });

    const req = httpMock.expectOne(() => true);
    req.flush([{
      id: '1',
      price: 150,
      pricePerNight: 200,
    }]);
  });

  it('uses pricePerNight when price is undefined', () => {
    service.getHotels().subscribe((hotels) => {
      expect(hotels[0].pricePerNight).toBe(120);
    });

    const req = httpMock.expectOne(() => true);
    req.flush([{
      id: '1',
      pricePerNight: 120,
    }]);
  });

  it('filters out NaN ratings', () => {
    service.getHotels().subscribe((hotels) => {
      expect(hotels[0].rating).toBe(0);
    });

    const req = httpMock.expectOne(() => true);
    req.flush([{
      id: '1',
      rating: NaN,
    }]);
  });

  it('does not include authorization header when token is empty', () => {
    spyOnProperty(configService, 'propertyApiToken', 'get').and.returnValue('');

    service.getHotels().subscribe();

    const req = httpMock.expectOne(() => true);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('handles capacity parameter zero', () => {
    service.getHotels({ capacity: 0 }).subscribe();

    const req = httpMock.expectOne(() => true);
    expect(req.request.params.has('capacity')).toBe(false);
    req.flush([]);
  });

  it('handles capacity parameter negative', () => {
    service.getHotels({ capacity: -5 }).subscribe();

    const req = httpMock.expectOne(() => true);
    expect(req.request.params.has('capacity')).toBe(false);
    req.flush([]);
  });

  it('includes pagination params when provided', () => {
    service.getHotels({ page: 2, size: 10 }).subscribe();

    const req = httpMock.expectOne(() => true);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('10');
    req.flush([]);
  });

  describe('getHotelsWithPricing', () => {
    it('enriches hotels with pricing data from PricingService (AC-1)', () => {
      pricingService.getPropertyWithPrice.and.callFake((params: { propertyId: string }) => {
        if (params.propertyId === '1') {
          return of({ price: 150 });
        }
        return of({ price: 200 });
      });

      let result: any[];
      service.getHotelsWithPricing().subscribe((hotels) => {
        result = hotels;
      });

      const req = httpMock.expectOne(() => true);
      req.flush([
        { id: '1', name: 'Hotel A', pricePerNight: 0 },
        { id: '2', name: 'Hotel B', pricePerNight: 0 },
      ]);

      expect(result!.length).toBe(2);
      expect(result![0].pricePerNight).toBe(150);
      expect(result![1].pricePerNight).toBe(200);
      expect(pricingService.getPropertyWithPrice).toHaveBeenCalledTimes(2);
    });

    it('passes correct params to PricingService (guests=1, tomorrow dates)', () => {
      service.getHotelsWithPricing().subscribe();

      const req = httpMock.expectOne(() => true);
      req.flush([{ id: 'prop-1', name: 'Hotel' }]);

      expect(pricingService.getPropertyWithPrice).toHaveBeenCalledTimes(1);
      const callArgs = pricingService.getPropertyWithPrice.calls.first().args[0];
      expect(callArgs.propertyId).toBe('prop-1');
      expect(callArgs.guests).toBe(1);
      expect(callArgs.dateInit).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(callArgs.dateFinish).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify dateFinish is one day after dateInit
      const dateInit = new Date(callArgs.dateInit);
      const dateFinish = new Date(callArgs.dateFinish);
      const diffMs = dateFinish.getTime() - dateInit.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(1);
    });

    it('returns empty array when property list is empty', () => {
      let result: any[];
      service.getHotelsWithPricing().subscribe((hotels) => {
        result = hotels;
      });

      const req = httpMock.expectOne(() => true);
      req.flush([]);

      expect(result!).toEqual([]);
      expect(pricingService.getPropertyWithPrice).not.toHaveBeenCalled();
    });

    it('falls back to price 0 when individual pricing call fails (AC-6)', () => {
      pricingService.getPropertyWithPrice.and.callFake((params: { propertyId: string }) => {
        if (params.propertyId === '1') {
          return throwError(() => new Error('Pricing service unavailable'));
        }
        return of({ price: 250 });
      });

      let result: any[];
      service.getHotelsWithPricing().subscribe((hotels) => {
        result = hotels;
      });

      const req = httpMock.expectOne(() => true);
      req.flush([
        { id: '1', name: 'Hotel Fail' },
        { id: '2', name: 'Hotel Success' },
      ]);

      expect(result!.length).toBe(2);
      expect(result![0].pricePerNight).toBe(0);
      expect(result![1].pricePerNight).toBe(250);
    });

    it('preserves original hotel data while enriching with price', () => {
      pricingService.getPropertyWithPrice.and.returnValue(of({ price: 99 }));

      let result: any[];
      service.getHotelsWithPricing().subscribe((hotels) => {
        result = hotels;
      });

      const req = httpMock.expectOne(() => true);
      req.flush([
        {
          id: 'h1',
          name: 'Grand Hotel',
          city: 'Paris',
          country: 'France',
          rating: 4.5,
          photos: ['photo1.jpg'],
        },
      ]);

      expect(result![0].name).toBe('Grand Hotel');
      expect(result![0].city).toBe('Paris');
      expect(result![0].country).toBe('France');
      expect(result![0].rating).toBe(4.5);
      expect(result![0].pricePerNight).toBe(99);
    });

    it('pipes through getHotels with search params', () => {
      pricingService.getPropertyWithPrice.and.returnValue(of({ price: 50 }));

      service.getHotelsWithPricing({ city: 'London' }).subscribe();

      const req = httpMock.expectOne((request) =>
        request.url === 'https://api.example.com/poc-properties/api/property',
      );
      expect(req.request.params.get('city')).toBe('London');
      req.flush([{ id: '1', name: 'London Hotel' }]);
    });

    it('uses pricing result price even when hotel already has pricePerNight', () => {
      pricingService.getPropertyWithPrice.and.returnValue(of({ price: 300 }));

      let result: any[];
      service.getHotelsWithPricing().subscribe((hotels) => {
        result = hotels;
      });

      const req = httpMock.expectOne(() => true);
      req.flush([{ id: '1', name: 'Hotel', pricePerNight: 100 }]);

      expect(result![0].pricePerNight).toBe(300);
    });

    it('handles all pricing calls failing gracefully', () => {
      pricingService.getPropertyWithPrice.and.returnValue(
        throwError(() => new Error('Service down')),
      );

      let result: any[];
      service.getHotelsWithPricing().subscribe((hotels) => {
        result = hotels;
      });

      const req = httpMock.expectOne(() => true);
      req.flush([
        { id: '1', name: 'Hotel A' },
        { id: '2', name: 'Hotel B' },
      ]);

      expect(result!.length).toBe(2);
      expect(result![0].pricePerNight).toBe(0);
      expect(result![1].pricePerNight).toBe(0);
    });
  });
});
