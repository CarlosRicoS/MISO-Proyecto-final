# Feature: i18n — Runtime Language Toggle (English / Spanish)

**Status:** Implemented  
**Created:** 2026-05-05  
**Implemented:** 2026-05-05  
**Author:** Angel Henao  
**Slug:** `add-i18n-language-toggle`

---

## Summary

Add runtime internationalization (i18n) to both Angular apps in `user_interface/` using `@ngx-translate`, with support for English (`en-US`) and Spanish Colombia (`es-CO`). A language toggle button in the navbar lets users switch instantly without a page reload; the selection is persisted in `localStorage`.

---

## Problem Statement

- All user-visible strings in the TravelHub traveler app (`src/`) are hardcoded in English. The hotel admin portal (`projects/portal-hoteles/`) also contains hardcoded English strings.
- The platform serves Colombian and Latin American markets, making Spanish (`es-CO`) the primary target locale.
- Currency formatting is manual (`${currency}${price}`) and does not adapt to the active locale.
- The `ion-datetime` picker has `locale="es-ES"` hardcoded — it should follow the active locale.
- There is no mechanism for users to switch language in-app.

**Success looks like:** A traveler (or hotel admin) can tap an ES/EN chip in the navbar, and every visible label, button, placeholder, and currency amount switches language instantly — no page reload required.

---

## Acceptance Criteria

1. [x] `@ngx-translate/core` and `@ngx-translate/http-loader` are installed in `user_interface/`.
2. [x] `TranslateModule` is imported in `AppModule` (traveler app) and in `portal-hoteles/AppModule` with `HttpLoaderFactory` pointing to `assets/i18n/`.
3. [x] Translation JSON files exist at `src/assets/i18n/en.json` and `src/assets/i18n/es.json` for the traveler app, covering all pages: `login`, `register`, `home`, `search-results`, `propertydetail`, `booking-list`, `booking-detail`, `notifications`.
4. [x] Translation JSON files exist at `projects/portal-hoteles/src/assets/i18n/en.json` and `projects/portal-hoteles/src/assets/i18n/es.json`, covering all pages: `login`, `dashboard`, `dashboard-reservation`, `pricing-configuration`, `reports`.
5. [x] All hardcoded user-visible strings in HTML templates of both apps are replaced with `{{ 'key' | translate }}` (or `[attr]="'key' | translate"` for attribute bindings).
6. [x] A language toggle chip (`ES | EN`) is added to `th-navbar` component — visible on desktop layout — that calls `TranslateService.use()` and persists the selection to `localStorage` under key `th_locale`.
7. [x] On app startup, the active locale is restored from `localStorage['th_locale']`; if absent, defaults to `es` (Spanish).
8. [x] The `ion-datetime` `locale` binding in `th-datetime-modal` is driven by the active `TranslateService` locale (e.g., `es-ES` for `es`, `en-US` for `en`).
9. [x] Currency amounts displayed in `search-results` and `booking-list` are formatted using Angular `CurrencyPipe` with the active locale: COP-style (`$780.000`) for `es`, USD-style (`$780.00`) for `en`.
10. [x] Playwright E2E test verifies that clicking the language toggle in the traveler app switches the home page hero title from Spanish to English (and back).
11. [x] All existing Karma/Jest unit tests continue to pass after the translation pipe is introduced (translate module configured in test bed).
12. [x] `portal-hoteles` header bar (`PortalHotelesHeaderBarComponent`) includes a language toggle following the same pattern as `th-navbar`.

---

## Affected Services

| Service | Language | Changes | Notes |
|---|---|---|---|
| `user_interface` (traveler app) | Angular 20 / TypeScript | New i18n module, translation files, pipe usage, navbar toggle | Primary scope |
| `user_interface` (portal-hoteles) | Angular 20 / TypeScript | Same pattern applied to admin app | Secondary scope |

No backend services are affected.

---

## API Contracts

No new or modified backend API contracts. Translation JSON files are loaded client-side via `HttpClient` from `assets/i18n/`.

---

## Data Model Changes

None. The only persistence is `localStorage['th_locale']` (a string: `'en'` or `'es'`), managed entirely client-side.

---

## Cross-Service Communication

Translation files are static JSON assets served by the Angular dev server and Nginx (Docker). No inter-service HTTP calls.

```
User clicks language toggle
  → TranslateService.use('es' | 'en')
  → HttpLoader fetches /assets/i18n/<lang>.json (cached after first load)
  → All {{ 'key' | translate }} bindings re-emit
  → localStorage['th_locale'] updated
```

---

## Translation Key Structure

Translation JSON files use a namespaced flat-key schema:

```json
{
  "NAV": {
    "SEARCH": "Search",
    "BOOKINGS": "Bookings",
    "SIGN_IN": "Sign In",
    "SIGN_UP": "Sign Up",
    "LANGUAGE_TOGGLE": "ES"
  },
  "LOGIN": {
    "TITLE": "Welcome Back",
    "SUBTITLE": "Sign in to your TravelHub account",
    "EMAIL_LABEL": "Email",
    "EMAIL_PLACEHOLDER": "Enter your email",
    "PASSWORD_LABEL": "Password",
    "PASSWORD_PLACEHOLDER": "Enter your password",
    "SUBMIT": "Sign In",
    "NO_ACCOUNT": "Don't have an account?",
    "REGISTER_LINK": "Sign up"
  },
  "HOME": {
    "HERO_TITLE": "Find Your Perfect Stay",
    "HERO_SUBTITLE_WEB": "Discover amazing hotels worldwide with the best prices and instant booking",
    "HERO_SUBTITLE_MOBILE": "Discover amazing hotels worldwide",
    "SEARCH_ACTION": "Search Hotels",
    "DESTINATION_LABEL": "Destination",
    "DESTINATION_PLACEHOLDER": "Where are you going?",
    "CHECKIN_LABEL": "Check-in",
    "CHECKOUT_LABEL": "Check-out",
    "GUESTS_LABEL": "Guests",
    "GUESTS_PLACEHOLDER": "1 Guest"
  },
  "SEARCH": {
    "HOTEL_FOUND_ONE": "hotel found",
    "HOTELS_FOUND": "hotels found",
    "VIEW_DETAILS": "View Details",
    "LOADING": "Loading hotels...",
    "LOADING_MORE": "Loading more hotels...",
    "NO_RESULTS": "No hotels available for this search.",
    "PRICE_SUFFIX": "/night"
  },
  "PROPERTY": {
    "VIEW_ALL_PHOTOS": "View all {{count}} photos",
    "ABOUT": "About This Hotel",
    "AMENITIES": "View All Amenities",
    "REVIEWS": "Guest Reviews",
    "READ_MORE": "Read More",
    "READ_LESS": "Read Less",
    "BOOK_NOW": "Book Now",
    "ACCEPT": "Accept",
    "CANCEL": "Cancel"
  },
  "BOOKING_LIST": {
    "TITLE": "My Reservations",
    "SEE_DETAILS": "See Details",
    "TOTAL_PREFIX": "Total"
  },
  "BOOKING_DETAIL": {
    "CANCEL_BOOKING": "Cancel booking"
  },
  "REGISTER": {
    "TITLE": "Create Account",
    "SUBTITLE": "Create your account to start booking amazing hotels worldwide",
    "FULL_NAME_LABEL": "Full Name",
    "FULL_NAME_PLACEHOLDER": "Enter your full name",
    "SUBMIT": "Sign Up",
    "HAVE_ACCOUNT": "Already have an account?",
    "LOGIN_LINK": "Sign in",
    "BACK": "Back"
  },
  "COMMON": {
    "ACCEPT": "Accept",
    "CANCEL": "Cancel",
    "LOADING": "Loading...",
    "ERROR": "An error occurred. Please try again."
  }
}
```

Spanish (`es.json`) provides the translated equivalents for every key above.

---

## Implementation Notes

### Library choice: `@ngx-translate` vs Angular native `@angular/localize`

`@ngx-translate` is chosen because:
- Runtime language switching without a page reload is required (see Acceptance Criterion 6).
- A single build output is served for both locales.
- The `translate` pipe integrates cleanly alongside the existing `PlatformTextDirective`.

### PlatformTextDirective coexistence

The `appPlatformText*` inputs still receive raw strings. When those strings need to be translated, the component TS layer calls `translateService.instant('KEY')` and passes the result to the input, or the template uses `'KEY' | translate` where the directive is not involved.

### Currency formatting

Replace manual `\`${currency}${price}\`` with Angular `CurrencyPipe`:
- `es` locale → `'COP'` currency, `'es-CO'` locale string → renders `$780.000`  
- `en` locale → `'USD'` currency, `'en-US'` locale string → renders `$780.00`

A `LocaleService` wraps `TranslateService` and exposes `currencyCode$` and `localeCode$` observables for use in components.

### ngx-translate v17 wiring (delta vs PLAN.md)

The implementation uses `@ngx-translate/core` v17, which replaces the v15 `HttpLoaderFactory` factory function (originally described in PLAN.md) with the standalone provider `provideTranslateHttpLoader({ prefix: './assets/i18n/', suffix: '.json' })`. Both `AppModule`s wire `TranslateModule.forRoot({ defaultLanguage: 'es' })` plus a second `APP_INITIALIZER` that calls `LocaleService.init()` (after `registerLocaleData(localeEsCO)`).

---

## Out of Scope

- Server-side rendering (SSR) or pre-rendering for SEO per locale.
- More than two locales (e.g., Portuguese, French) in this iteration.
- Translation of dynamic content from the API (hotel names, descriptions, location names).
- Translation of backend error messages returned by FastAPI/Spring Boot services.
- Android-native i18n via Capacitor `strings.xml` resources.
- Right-to-left (RTL) layout support.
- Pluralization beyond the `hotel found / hotels found` pattern already in `search-results`.

---

## Open Questions

| # | Question | Resolution |
|---|---|---|
| 1 | Should the default locale be `es` (Spanish) even when the browser signals `en-US`? | RESOLVED: Default is `es`. `localStorage['th_locale']` overrides on first toggle. |
| 2 | Should `portal-hoteles` header bar show the language toggle on mobile too, or only desktop? | RESOLVED: Desktop-only, matching `th-navbar` behavior. |
| 3 | Dynamic strings generated in `.ts` (e.g., `alertTitle`, `cancelConfirmMessage`) — translate via `TranslateService.instant()` or leave in English for v1? | RESOLVED: Critical user-facing alerts translated via `TranslateService.instant()`; internal/dev strings left in English. |

---

## Notes

- `@ngx-translate/http-loader` loads JSON files from `assets/i18n/` via `HttpClient`. The `forRoot()` call in `AppModule` configures this loader.
- Translation files must be added to the `assets` array in `angular.json` for both projects so they are included in the build output.
- The `portal-hoteles` project's `angular.json` entry already has its own `assets` config (at `projects/portal-hoteles`) — its i18n files go in `projects/portal-hoteles/src/assets/i18n/`.
- Karma test beds need `TranslateModule.forRoot()` (with no loader, or a `FakeLoader`) to avoid `translate` pipe errors in unit tests.
