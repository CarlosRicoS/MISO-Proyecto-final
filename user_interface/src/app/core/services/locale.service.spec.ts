import { TestBed } from '@angular/core/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { LocaleService } from './locale.service';

/**
 * Minimal test loader that returns an empty translation table.
 * Avoids hitting HTTP for assets/i18n/*.json during unit tests.
 */
class TestTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, never>> {
    return of({});
  }
}

const LOCALE_KEY = 'th_locale';

describe('LocaleService', () => {
  let service: LocaleService;

  beforeEach(() => {
    window.localStorage.clear();

    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TestTranslateLoader },
          fallbackLang: 'es',
        }),
      ],
    });

    service = TestBed.inject(LocaleService);
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  describe('init()', () => {
    it('restores Spanish from localStorage when th_locale is "es"', () => {
      window.localStorage.setItem(LOCALE_KEY, 'es');

      service.init();

      expect(service.currentLang).toBe('es');
    });

    it('restores English from localStorage when th_locale is "en"', () => {
      window.localStorage.setItem(LOCALE_KEY, 'en');

      service.init();

      expect(service.currentLang).toBe('en');
    });

    it('defaults to "es" when localStorage is empty', () => {
      service.init();

      expect(service.currentLang).toBe('es');
    });

    it('defaults to "es" when localStorage holds an unsupported value', () => {
      window.localStorage.setItem(LOCALE_KEY, 'fr');

      service.init();

      expect(service.currentLang).toBe('es');
    });
  });

  describe('toggle()', () => {
    it('flips from "es" to "en" and persists to localStorage', () => {
      service.init();
      expect(service.currentLang).toBe('es');

      service.toggle();

      expect(service.currentLang).toBe('en');
      expect(window.localStorage.getItem(LOCALE_KEY)).toBe('en');
    });

    it('flips from "en" to "es" and persists to localStorage', () => {
      window.localStorage.setItem(LOCALE_KEY, 'en');
      service.init();
      expect(service.currentLang).toBe('en');

      service.toggle();

      expect(service.currentLang).toBe('es');
      expect(window.localStorage.getItem(LOCALE_KEY)).toBe('es');
    });
  });

  describe('localeCode getter', () => {
    it('returns "es-CO" when current language is Spanish', () => {
      service.init();

      expect(service.localeCode).toBe('es-CO');
    });

    it('returns "en-US" when current language is English', () => {
      window.localStorage.setItem(LOCALE_KEY, 'en');
      service.init();

      expect(service.localeCode).toBe('en-US');
    });
  });

  describe('currencyCode getter', () => {
    it('returns "COP" when current language is Spanish', () => {
      service.init();

      expect(service.currencyCode).toBe('COP');
    });

    it('returns "USD" when current language is English', () => {
      window.localStorage.setItem(LOCALE_KEY, 'en');
      service.init();

      expect(service.currencyCode).toBe('USD');
    });
  });

  describe('formatCurrency()', () => {
    it('formats COP-style for Spanish locale', () => {
      service.init();

      const result = service.formatCurrency(780000);

      // Strip non-breaking spaces (Intl can emit U+00A0) before assertions.
      const normalised = result.replace(/ /g, ' ');
      expect(normalised).toContain('780');
      // Either "$" or "COP" should be present depending on the runtime ICU build.
      expect(/\$|COP/.test(normalised)).toBeTrue();
    });

    it('formats USD-style for English locale', () => {
      window.localStorage.setItem(LOCALE_KEY, 'en');
      service.init();

      const result = service.formatCurrency(780.5);

      const normalised = result.replace(/ /g, ' ');
      expect(normalised).toContain('780');
      expect(/\$|USD/.test(normalised)).toBeTrue();
    });

    it('returns a fallback formatted zero for non-finite input', () => {
      service.init();

      const nanResult = service.formatCurrency(Number.NaN);
      const infinityResult = service.formatCurrency(Number.POSITIVE_INFINITY);

      // Each should be the same as formatting 0 with the active locale.
      const zeroFormatted = service.formatCurrency(0);
      expect(nanResult).toBe(zeroFormatted);
      expect(infinityResult).toBe(zeroFormatted);
    });
  });

  describe('currentLang$ observable', () => {
    it('emits the new language after toggle()', () => {
      service.init();
      const emitted: string[] = [];

      const subscription = service.currentLang$.subscribe((lang) => emitted.push(lang));

      service.toggle();
      service.toggle();

      subscription.unsubscribe();

      // Initial emission ('es') + two toggles -> at least three values.
      expect(emitted.length).toBeGreaterThanOrEqual(3);
      expect(emitted[emitted.length - 2]).toBe('en');
      expect(emitted[emitted.length - 1]).toBe('es');
    });
  });

  describe('LOCALE_KEY constant', () => {
    it('exposes the storage key used to persist the language', () => {
      expect(service.LOCALE_KEY).toBe('th_locale');
    });
  });

  describe('localStorage failure resilience', () => {
    it('falls back to default lang when reading localStorage throws', () => {
      const getItemSpy = spyOn(window.localStorage, 'getItem').and.throwError('boom');

      service.init();

      expect(service.currentLang).toBe('es');
      expect(getItemSpy).toHaveBeenCalled();
    });

    it('does not propagate when writing localStorage throws', () => {
      service.init();
      spyOn(window.localStorage, 'setItem').and.throwError('quota');

      expect(() => service.toggle()).not.toThrow();
      expect(service.currentLang).toBe('en');
    });
  });
});
