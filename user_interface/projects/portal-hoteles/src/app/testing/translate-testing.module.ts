import { ModuleWithProviders } from '@angular/core';
import { TranslateLoader, TranslateModule, type TranslationObject } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import enTranslations from '../../assets/i18n/en.json';

/**
 * Portal-hoteles unit-test counterpart to the traveler app's
 * translate-testing module. Returns the English translation table so any
 * spec asserting against the originally-hardcoded English copy keeps
 * working after the templates were migrated to the `translate` pipe.
 */
export class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<TranslationObject> {
    return of(enTranslations as unknown as TranslationObject);
  }
}

export function translateTestingModule(): ModuleWithProviders<TranslateModule> {
  return TranslateModule.forRoot({
    loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
    fallbackLang: 'en',
    defaultLanguage: 'en',
  });
}
