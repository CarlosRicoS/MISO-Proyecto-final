import { TestBed } from '@angular/core/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { CurrencyConversionService } from '@travelhub/core/services/currency-conversion.service';
import { LocaleService } from '@travelhub/core/services/locale.service';
import { ThCurrencyPipe } from './th-currency.pipe';

class TestTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, never>> {
    return of({});
  }
}

describe('ThCurrencyPipe', () => {
  let pipe: ThCurrencyPipe;

  const currencyConversionServiceStub = {
    convertAmount: jasmine.createSpy('convertAmount').and.callFake((value: number | string | null | undefined, currency: string) => {
      const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '')) || 0;
      if (currency === 'USD') return numeric * 0.25;
      if (currency === 'EUR') return numeric * 0.2;
      return numeric;
    }),
  };

  beforeEach(async () => {
    currencyConversionServiceStub.convertAmount.calls.reset();

    await TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TestTranslateLoader },
          fallbackLang: 'es',
        }),
      ],
      providers: [
        ThCurrencyPipe,
        LocaleService,
        { provide: CurrencyConversionService, useValue: currencyConversionServiceStub },
      ],
    }).compileComponents();

    const localeService = TestBed.inject(LocaleService);
    await localeService.init();
    pipe = TestBed.inject(ThCurrencyPipe);
  });

  it('converts COP amounts to USD using the conversion service', () => {
    // Arrange

    // Act
    const result = pipe.transform(1000, 'USD');

    // Assert
    expect(currencyConversionServiceStub.convertAmount).toHaveBeenCalledWith(1000, 'USD');
    expect(result).not.toBe('');
  });

  it('converts COP amounts to EUR using the conversion service', () => {
    // Arrange

    // Act
    const result = pipe.transform(1000, 'EUR');

    // Assert
    expect(currencyConversionServiceStub.convertAmount).toHaveBeenCalledWith(1000, 'EUR');
    expect(result).not.toBe('');
  });

  it('keeps COP amounts unchanged for COP output', () => {
    // Arrange

    // Act
    const result = pipe.transform(1000, 'COP');

    // Assert
    expect(currencyConversionServiceStub.convertAmount).toHaveBeenCalledWith(1000, 'COP');
    expect(result).not.toBe('');
  });
});