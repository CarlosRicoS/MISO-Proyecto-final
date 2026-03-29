import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HotelsService } from './hotels.service';
import { ConfigService } from './config.service';

class ConfigServiceStub {
  apiBaseUrl = 'https://api.example.com';
  propertyApiPath = '/poc-properties/api/property';
  propertyApiToken = 'token';
}

describe('HotelsService', () => {
  let service: HotelsService;
  let httpMock: HttpTestingController;

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
      expect(hotels[0].imageUrl).toBe('https://img.example.com/1.jpg');
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
});
