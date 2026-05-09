import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { AppCacheService } from './app-cache.service';
import { CurrencyConversionService } from './currency-conversion.service';

describe('CurrencyConversionService', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CurrencyConversionService, AppCacheService],
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('loads USD conversion rates from quote-array payload and stores them in localStorage', async () => {
    // Arrange
    const service = TestBed.inject(CurrencyConversionService);
    const loadPromise = service.ensureRatesLoaded();

    const request = httpMock.expectOne('https://api.frankfurter.dev/v2/rates?base=USD&quotes=EUR,COP');
    expect(request.request.method).toBe('GET');
    request.flush([
      { date: '2026-05-08', base: 'USD', quote: 'COP', rate: 3920.5 },
      { date: '2026-05-08', base: 'USD', quote: 'EUR', rate: 0.88 },
    ]);

    // Act
    await loadPromise;

    // Assert
    expect(service.convertAmount(1000, 'USD')).toBe(1000);
    expect(service.convertAmount(1000, 'EUR')).toBeCloseTo(880, 10);
    expect(service.convertAmount(1000, 'COP')).toBeCloseTo(3920500, 10);
    expect(localStorage.getItem('th_currency_conversion_rates')).not.toBeNull();
  });

  it('does not fetch again when cached rates are present', async () => {
    // Arrange
    localStorage.setItem(
      'th_currency_conversion_rates',
      JSON.stringify({
        baseCurrency: 'USD',
        fetchedAt: '2026-05-08T00:00:00.000Z',
        rates: { USD: 1, COP: 3920, EUR: 0.88 },
      }),
    );

    const cachedService = TestBed.inject(CurrencyConversionService);

    // Act
    await cachedService.ensureRatesLoaded();

    // Assert
    httpMock.expectNone('https://api.frankfurter.dev/v2/rates?base=USD&quotes=EUR,COP');
    expect(cachedService.convertAmount(2, 'COP')).toBe(7840);
  });

  it('refetches rates when cached values are malformed', async () => {
    // Arrange
    localStorage.setItem(
      'th_currency_conversion_rates',
      JSON.stringify({
        baseCurrency: 'COP',
        fetchedAt: '2026-05-08T00:00:00.000Z',
        rates: { COP: 1, USD: 1, EUR: 1 },
      }),
    );

    const service = TestBed.inject(CurrencyConversionService);

    // Act
    const loadPromise = service.ensureRatesLoaded();

    const request = httpMock.expectOne('https://api.frankfurter.dev/v2/rates?base=USD&quotes=EUR,COP');
    expect(request.request.method).toBe('GET');
    request.flush({
      amount: 1,
      date: '2026-05-08',
      base: 'USD',
      rates: {
        COP: 4000,
        EUR: 0.9,
      },
    });
    await loadPromise;

    // Assert
    expect(service.convertAmount(5000, 'COP')).toBeCloseTo(20000000, 10);
    expect(service.convertAmount(5000, 'EUR')).toBeCloseTo(4500, 10);
  });

  it('also supports object payload with rates map', async () => {
    // Arrange
    const service = TestBed.inject(CurrencyConversionService);

    // Act
    const loadPromise = service.ensureRatesLoaded();
    const request = httpMock.expectOne('https://api.frankfurter.dev/v2/rates?base=USD&quotes=EUR,COP');
    expect(request.request.method).toBe('GET');
    request.flush({
      amount: 1,
      date: '2026-05-08',
      base: 'USD',
      rates: {
        COP: 4100,
        EUR: 0.87,
      },
    });
    await loadPromise;

    // Assert
    expect(service.convertAmount(1000, 'COP')).toBeCloseTo(4100000, 10);
    expect(service.convertAmount(1000, 'EUR')).toBeCloseTo(870, 10);
  });
});