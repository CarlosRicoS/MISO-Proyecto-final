import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HotelsService } from './hotels.service';
import { ConfigService } from './config.service';

class ConfigServiceStub {
  private _apiBaseUrl = 'https://api.example.com';
  private _propertyApiPath = '/poc-properties/api/property';
  private _propertyApiToken = 'token';

  get apiBaseUrl(): string {
    return this._apiBaseUrl;
  }

  get propertyApiPath(): string {
    return this._propertyApiPath;
  }

  get propertyApiToken(): string {
    return this._propertyApiToken;
  }
}

describe('HotelsService', () => {
  let service: HotelsService;
  let httpMock: HttpTestingController;
  let configService: ConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        HotelsService,
        { provide: ConfigService, useClass: ConfigServiceStub },
      ],
    });

    service = TestBed.inject(HotelsService);
    httpMock = TestBed.inject(HttpTestingController);
    configService = TestBed.inject(ConfigService);
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
});
