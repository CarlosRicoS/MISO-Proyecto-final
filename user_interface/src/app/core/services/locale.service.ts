import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Single source of truth for the active UI locale.
 *
 * Wraps `TranslateService` and persists the user's choice to
 * `localStorage` under the `th_locale` key. Components inject this
 * service rather than `TranslateService` directly so that the
 * locale-derived helpers (`localeCode`, `currencyCode`,
 * `formatCurrency`) stay in one place.
 */
@Injectable({ providedIn: 'root' })
export class LocaleService {
  /** Storage key for the persisted language preference. */
  readonly LOCALE_KEY = 'th_locale';

  /** Default language used on first visit. */
  private readonly DEFAULT_LANG: SupportedLang = 'es';

  /** Supported language codes accepted by the app. */
  private readonly SUPPORTED_LANGS: ReadonlyArray<SupportedLang> = ['es', 'en'];

  private readonly translate = inject(TranslateService);
  private readonly currentLangSubject = new BehaviorSubject<SupportedLang>(this.DEFAULT_LANG);

  /** Emits the active language code (`'es' | 'en'`) on every switch. */
  readonly currentLang$: Observable<string> = this.currentLangSubject.asObservable();

  /** Synchronous getter for the current language (`'es' | 'en'`). */
  get currentLang(): string {
    return this.currentLangSubject.value;
  }

  /** Locale string used by `Intl` APIs and `ion-datetime`. */
  get localeCode(): string {
    return this.currentLang === 'es' ? 'es-CO' : 'en-US';
  }

  /** ISO 4217 currency code for the active locale. */
  get currencyCode(): string {
    return this.currentLang === 'es' ? 'COP' : 'USD';
  }

  /**
   * Restores the persisted language from `localStorage` and applies it to
   * `TranslateService`. Called from an `APP_INITIALIZER` so the choice is
   * active before the first render.
   */
  init(): void {
    const lang = this.readPersistedLang() ?? this.DEFAULT_LANG;
    this.translate.addLangs([...this.SUPPORTED_LANGS]);
    // Use the new fallback API in ngx-translate v17+ if available, fall back to setDefaultLang.
    const translateAny = this.translate as unknown as {
      setFallbackLang?: (lang: string) => unknown;
      setDefaultLang?: (lang: string) => unknown;
    };
    if (typeof translateAny.setFallbackLang === 'function') {
      translateAny.setFallbackLang(this.DEFAULT_LANG);
    } else if (typeof translateAny.setDefaultLang === 'function') {
      translateAny.setDefaultLang(this.DEFAULT_LANG);
    }
    this.applyLang(lang);
  }

  /**
   * Switches between Spanish and English, persists the new choice,
   * and notifies subscribers.
   */
  toggle(): void {
    const next: SupportedLang = this.currentLang === 'es' ? 'en' : 'es';
    this.applyLang(next);
    this.persistLang(next);
  }

  /**
   * Formats a numeric amount for the active locale + currency using
   * `Intl.NumberFormat`. Returns a fallback `'$0'` if the input is
   * not finite.
   */
  formatCurrency(amount: number): string {
    if (!Number.isFinite(amount)) {
      return this.formatCurrency(0);
    }

    const fractionDigits = this.currencyCode === 'COP' ? 0 : 2;

    try {
      return new Intl.NumberFormat(this.localeCode, {
        style: 'currency',
        currency: this.currencyCode,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(amount);
    } catch {
      return `$${amount}`;
    }
  }

  private applyLang(lang: SupportedLang): void {
    this.translate.use(lang);
    this.currentLangSubject.next(lang);
  }

  private persistLang(lang: SupportedLang): void {
    try {
      window.localStorage.setItem(this.LOCALE_KEY, lang);
    } catch {
      // Ignore storage failures (private browsing, quota exceeded, etc.)
    }
  }

  private readPersistedLang(): SupportedLang | null {
    try {
      const stored = window.localStorage.getItem(this.LOCALE_KEY);
      return this.SUPPORTED_LANGS.includes(stored as SupportedLang) ? (stored as SupportedLang) : null;
    } catch {
      return null;
    }
  }
}

type SupportedLang = 'es' | 'en';
