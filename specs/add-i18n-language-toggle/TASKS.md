# Tasks: i18n — Runtime Language Toggle (English / Spanish)

**Based on:** `specs/add-i18n-language-toggle/PLAN.md`  
**Created:** 2026-05-05  
**Total tasks:** 9  
**Agents involved:** implementation-engineer, test-engineer, review-engineer, devops-engineer, docs-engineer

---

## Phase 4 Execution Plan

```
[1] IMPL-01  →  implementation-engineer  Foundation: packages, LocaleService, AppModules, assets
[2] IMPL-02  →  implementation-engineer  Shared components: navbar, datetime-modal, portal header-bar
[3] IMPL-03  →  implementation-engineer  Traveler app pages: all templates + TS currency/directive wiring
[4] IMPL-04  →  implementation-engineer  Portal-hoteles pages: all templates + TS
[5] TEST-01  →  test-engineer            Unit tests: LocaleService + component spec fixes
[6] TEST-02  →  test-engineer            Playwright E2E: language toggle flow
[7] RVEW-01  →  review-engineer          Verify tests + review vs SPEC.md AC checklist
[8] DEVOPS-01 → devops-engineer          Confirm CI/CD pipeline unchanged (frontend-only); note no Postman changes
[9] DOCS-01  →  docs-engineer            Sync SPEC.md, update CLAUDE.md with i18n architecture
```

---

## Task List

| ID | Agent | Description | Depends On | Status |
|---|---|---|---|---|
| IMPL-01 | implementation-engineer | **Foundation**: install `@ngx-translate/core` + `@ngx-translate/http-loader`; create `LocaleService` (`user_interface/src/app/core/services/locale.service.ts`) with `toggle()`, `init()`, `formatCurrency()`, `localeCode`, `currencyCode` getters and `currentLang$` observable; wire `TranslateModule.forRoot()` + `registerLocaleData(localeEsCO)` + second `APP_INITIALIZER` into both `AppModule`s (`src/app/app.module.ts` and `projects/portal-hoteles/src/app/app.module.ts`); re-export `TranslateModule` from `SharedCommonModule`; add `TranslateModule` to `imports` of page modules that use `loadChildren` (search-results, booking-list, propertydetail) via SharedCommonModule; create all four translation JSON files (`src/assets/i18n/en.json`, `src/assets/i18n/es.json`, `projects/portal-hoteles/src/assets/i18n/en.json`, `projects/portal-hoteles/src/assets/i18n/es.json`); add i18n asset globs to `angular.json` for both projects. | — | ✅ done |
| IMPL-02 | implementation-engineer | **Shared standalone components**: (a) `ThNavbarComponent` — add `TranslateModule` to `imports`, inject `LocaleService`, add `toggleLanguage()` and `get currentLang()`, add `ES\|EN` chip in desktop actions area of template, replace `'Search'`/`'Bookings'`/`'Sign In'`/`'Sign Up'` with translate keys; (b) `ThDatetimeModalComponent` — inject `LocaleService`, add `get dateLocale()` getter, replace `locale="es-ES"` with `[locale]="dateLocale"` in template; (c) `PortalHotelesHeaderBarComponent` — add `TranslateModule` to `imports`, inject `LocaleService`, add `toggleLanguage()` and language chip in header template. | IMPL-01 | ✅ done |
| IMPL-03 | implementation-engineer | **Traveler app pages** — replace all hardcoded user-visible strings with `translate` pipe or `translate.instant()` calls across: (a) home page — hero title, hero subtitles (via `translate.instant()` in TS for `PlatformTextDirective` inputs, with `currentLang$` subscription to refresh), filter labels/placeholders, action label; (b) search-results — hotel found count labels, 'View Details', loading/empty messages, `getHotelPrice()` replaced with `LocaleService.formatCurrency()`; (c) booking-list — 'See Details', 'Total' prefix, loading messages, `formatPrice()` replaced with `LocaleService.formatCurrency()`; (d) propertydetail — 'View all N photos', 'About This Hotel', 'Book Now', 'Accept', 'Cancel', alert strings via `translate.instant()`; (e) login — all labels, placeholders, submit button, sign-up link; (f) register — all labels, placeholders, submit, back link; (g) booking-detail — 'Cancel booking'; (h) notifications — any visible strings. Standalone pages (login, register, booking-detail, notifications) also get `TranslateModule` added to their component `imports` array. | IMPL-01 | ✅ done |
| IMPL-04 | implementation-engineer | **Portal-hoteles pages** — add `TranslateModule` to `imports` of all five standalone page components; replace all hardcoded user-visible strings in HTML templates with translate pipe using `PORTAL.*` key namespaces (`NAV`, `LOGIN`, `DASHBOARD`, `DASHBOARD_RESERVATION`, `PRICING`, `REPORTS`, `COMMON`). Pages: login, dashboard, dashboard-reservation, pricing-configuration, reports. | IMPL-01 | ✅ done |
| TEST-01 | test-engineer | **Unit tests**: (a) create `user_interface/src/app/core/services/locale.service.spec.ts` — test `init()` restores from localStorage, `toggle()` switches lang and persists, `formatCurrency()` returns COP format for `es` and USD for `en`, `localeCode` and `currencyCode` return correct values; (b) fix all existing `*.spec.ts` files for components/pages that now use `{{ 'KEY' \| translate }}` — add `TranslateModule.forRoot()` with `TranslateFakeLoader` (or `TranslateTestingModule`) to each affected `TestBed`; run `npm test` and confirm all pass. Target: ≥80% coverage on `LocaleService`. | IMPL-01, IMPL-02, IMPL-03, IMPL-04 | ✅ done |
| TEST-02 | test-engineer | **Playwright E2E**: create `user_interface/e2e/web/i18n-toggle.spec.ts` — mock `GET /assets/i18n/es.json` and `GET /assets/i18n/en.json` with route intercepts; navigate to `/home`; assert hero title text matches Spanish string `'Encuentra tu alojamiento perfecto'`; click the language toggle chip in the navbar; assert hero title switches to English `'Find Your Perfect Stay'`; click toggle again; assert title reverts to Spanish; reload page; assert Spanish persists (localStorage). Run `npm run e2e:web` and confirm test passes. | IMPL-02, IMPL-03 | ✅ done |
| RVEW-01 | review-engineer | Verify all test suites pass (`npm test` + `npm run e2e:web`). Review implementation against every acceptance criterion in `specs/add-i18n-language-toggle/SPEC.md`. Check: (1) ngx-translate installed; (2) both AppModules wired; (3–4) all i18n JSON files present with complete keys; (5) no hardcoded user-visible strings remain in any HTML template; (6) language toggle chip present in th-navbar; (7) localStorage restore on startup; (8) ion-datetime locale binding dynamic; (9) currency adapts to locale; (10) E2E test passes; (11) existing unit tests pass; (12) portal-hoteles header bar has toggle. Flag documentation gaps. Return APPROVED or NEEDS FIXES with specific blocking issues. | TEST-01, TEST-02 | ✅ done |
| DEVOPS-01 | devops-engineer | Frontend-only feature — no new backend services, no new API endpoints, no Postman collection changes needed. Verify the existing CI/CD pipeline (`deploy_apps.yml`) already builds `travelhub` (Node.js/Angular) and that no additional workflow changes are required. Confirm the Docker build for `web_travelhub` and `web_portal_hoteles` copies the `assets/i18n/` directory into the Nginx container (verify `Dockerfile` and `Dockerfile.portal-hoteles` `COPY` steps include the full `dist/` output). If any gap found, patch the relevant Dockerfile `COPY` instruction. | RVEW-01 | ✅ done |
| DOCS-01 | docs-engineer | (1) Update `specs/add-i18n-language-toggle/SPEC.md`: set `Status` to `Implemented`, resolve all three open questions with final decisions (default locale `es`, desktop-only toggle for portal, critical alerts translated via `translate.instant()`). (2) Update `CLAUDE.md` — add a note under the `user_interface` frontend section describing the i18n architecture: `@ngx-translate`, `LocaleService`, `localStorage['th_locale']`, and which components host the toggle. (3) Update `user_interface/README.md` (if it exists) with the language toggle UX and the `@ngx-translate` dependency. | RVEW-01 | ✅ done |

---

## Acceptance Criteria Traceability

| Criterion | Implemented by | Tested by | Reviewed by |
|---|---|---|---|
| AC-1: `@ngx-translate/core` and `@ngx-translate/http-loader` installed | IMPL-01 | TEST-01 (import check) | RVEW-01 |
| AC-2: `TranslateModule` in both `AppModule`s with `HttpLoaderFactory` | IMPL-01 | TEST-01 | RVEW-01 |
| AC-3: Traveler i18n JSON files with all page namespaces | IMPL-01 | TEST-02 (route intercept) | RVEW-01 |
| AC-4: Portal-hoteles i18n JSON files with all page namespaces | IMPL-01 | TEST-01 | RVEW-01 |
| AC-5: All hardcoded strings replaced with `translate` pipe | IMPL-03, IMPL-04 | TEST-01 (pipe-not-found errors eliminated) | RVEW-01 |
| AC-6: Language toggle chip in `th-navbar` calling `TranslateService.use()` + localStorage persist | IMPL-02 | TEST-02 (E2E toggle click) | RVEW-01 |
| AC-7: App startup restores locale from `localStorage['th_locale']`, defaults to `es` | IMPL-01 | TEST-01 (LocaleService.init spec), TEST-02 (reload assertion) | RVEW-01 |
| AC-8: `ion-datetime` locale driven by active `TranslateService` locale | IMPL-02 | TEST-01 (datetime-modal spec) | RVEW-01 |
| AC-9: Currency formatted via Angular `CurrencyPipe` / `LocaleService.formatCurrency()` with active locale | IMPL-03 | TEST-01 (formatCurrency spec) | RVEW-01 |
| AC-10: Playwright E2E verifies language toggle switches hero title | TEST-02 | TEST-02 | RVEW-01 |
| AC-11: All existing Karma/Jest unit tests pass with translate module in test beds | TEST-01 | TEST-01 | RVEW-01 |
| AC-12: `PortalHotelesHeaderBarComponent` includes language toggle | IMPL-02 | TEST-01 (header-bar spec) | RVEW-01 |

---

## Notes

- No backend services are affected — DEVOPS-01 is a verification task only, not a pipeline modification task
- IMPL-01 must complete before any other IMPL task since all depend on `LocaleService` and `TranslateModule` being wired
- IMPL-02, IMPL-03, IMPL-04 can run sequentially within a single `implementation-engineer` agent invocation
- TEST-01 and TEST-02 can run in parallel (different concerns), but both depend on all IMPL tasks completing
- The `PlatformTextDirective` pattern (home page subtitles) is the trickiest part — see PLAN.md Risk Flags
