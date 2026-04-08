import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PropertyDetailService } from './property-detail.service';
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

describe('PropertyDetailService', () => {
  let service: PropertyDetailService;
  let httpMock: HttpTestingController;
  let configService: ConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PropertyDetailService,
        { provide: ConfigService, useClass: ConfigServiceStub },
      ],
    });

    service = TestBed.inject(PropertyDetailService);
    httpMock = TestBed.inject(HttpTestingController);
    configService = TestBed.inject(ConfigService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('builds request with auth header', () => {
    service.getPropertyDetail('prop-1').subscribe((property) => {
      expect(property.id).toBe('prop-1');
      expect(property.name).toBe('Property');
      expect(property.maxCapacity).toBe(0);
    });

    const req = httpMock.expectOne('https://api.example.com/poc-properties/api/property/prop-1');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token');
    req.flush({});
  });

  it('maps missing fields with defaults', () => {
    service.getPropertyDetail('prop-2').subscribe((property) => {
      expect(property.id).toBe('prop-2');
      expect(property.photos.length).toBe(0);
      expect(property.amenities.length).toBe(0);
      expect(property.reviews.length).toBe(0);
    });

    const req = httpMock.expectOne('https://api.example.com/poc-properties/api/property/prop-2');
    req.flush({});
  });

  it('maps amenities and reviews with fallback values', () => {
    service.getPropertyDetail('prop-3').subscribe((property) => {
      expect(property.amenities[0].description).toBe('Free WiFi');
      expect(property.amenities[1].id).toBe('');
      expect(property.reviews[0].rating).toBe(0);
      expect(property.reviews[0].name).toBe('');
    });

    const req = httpMock.expectOne('https://api.example.com/poc-properties/api/property/prop-3');
    req.flush({
      amenities: [
        { id: 'amen-1', description: 'Free WiFi' },
        { description: '' },
      ],
      reviews: [
        { id: 'rev-1', description: 'Nice', rating: NaN, name: '' },
      ],
    });
  });

  it('handles trailing slash in API base URL', () => {
    spyOnProperty(configService, 'apiBaseUrl', 'get').and.returnValue('https://api.example.com/');

    service.getPropertyDetail('prop-4').subscribe();

    const req = httpMock.expectOne('https://api.example.com/poc-properties/api/property/prop-4');
    req.flush({});
  });

  it('handles empty baseUrl and uses default path', () => {
    spyOnProperty(configService, 'apiBaseUrl', 'get').and.returnValue('');
    spyOnProperty(configService, 'propertyApiPath', 'get').and.returnValue('poc-properties/api/property');

    service.getPropertyDetail('prop-5').subscribe();

    const req = httpMock.expectOne('/poc-properties/api/property/prop-5');
    req.flush({});
  });

  it('does not include authorization header when token is empty', () => {
    spyOnProperty(configService, 'propertyApiToken', 'get').and.returnValue('');

    service.getPropertyDetail('prop-6').subscribe();

    const req = httpMock.expectOne('https://api.example.com/poc-properties/api/property/prop-6');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
});
