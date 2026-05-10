import { ModuleWithProviders } from '@angular/core';
import { TranslateLoader, TranslateModule, type TranslationObject } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import esTranslations from '../../assets/i18n/es.json';
import enTranslations from '../../assets/i18n/en.json';

/**
 * Test loader that returns the English translation table for unit tests.
 * Many existing component specs assert against the English copy that the
 * pages used to ship as hardcoded strings, so providing the English bundle
 * here keeps those expectations stable while still exercising the
 * `translate` pipe / `TranslateService.instant()` paths in production code.
 */
export class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang?: string): Observable<TranslationObject> {
    if (lang === 'es') {
      return of(esTranslations as unknown as TranslationObject);
    }

    return of(enTranslations as unknown as TranslationObject);
  }
}

/**
 * Convenience helper to add to TestBed `imports` arrays so any component that
 * uses the `translate` pipe or injects `TranslateService` works in unit tests.
 *
 * Usage:
 *   imports: [..., translateTestingModule()]
 */
export function translateTestingModule(): ModuleWithProviders<TranslateModule> {
  return TranslateModule.forRoot({
    loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
    fallbackLang: 'en',
    defaultLanguage: 'en',
  });
}
