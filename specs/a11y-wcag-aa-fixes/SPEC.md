# Feature: WCAG 2.1 AA Accessibility Fixes — TravelHub & Portal Hoteles

**Status:** Draft  
**Created:** 2026-04-24  
**Author:** Angel Henao  
**Slug:** `a11y-wcag-aa-fixes`

---

## Summary

Implement all 46 WCAG 2.1 Level AA accessibility findings from the `specs/a11y-report.md` audit across both Angular applications in `user_interface/`: the travelhub SPA and the portal-hoteles admin panel. Fixes cover ARIA labels, live regions, heading hierarchy, color contrast, focus indicators, and landmark structure. A Playwright/axe-core regression guard is added as the final deliverable.

---

## Problem Statement

The accessibility audit revealed three systemic gaps affecting every form, every loading state, and every hotel card in the app:

- **Screen reader users** cannot access form field labels (CRIT-02, CRIT-03) because `<label>` elements are never programmatically associated with `<ion-input>` controls — they hear only placeholder text.
- **AT users** are never notified when content loads or errors occur (MAJ-07–14) because dynamic paragraphs appear outside `aria-live` regions.
- **Low-vision users** encounter text that fails contrast minimums by more than 2× (AXE-02: 2.07:1 on the "From" price prefix; AXE-01: `user-scalable=no` blocks pinch-to-zoom entirely).
- **Screen reader users** cannot navigate by landmark (PH-AXE-02, PH-AXE-03) because portal-hoteles has duplicate `main` and `banner` landmarks, and its dashboard table uses `role="row"` without a `role="table"` ancestor.

Success means zero axe violations on all 6 audited pages and all findings in `a11y-report.md` resolved.

---

## Acceptance Criteria

### Group 1 — Button Names & Icons (CRIT-01, MAJ-01–06, AXE-07)

1. [ ] The `th-navbar` mobile action button (`th-navbar__mobile-action`) has a dynamic `[attr.aria-label]` bound to `"More options"` when `isBookingList` is true and `"Add to favorites"` otherwise; its `<ion-icon>` has `aria-hidden="true"`.
2. [ ] All decorative `<ion-icon>` elements in `th-hotel-card` (location-outline ×2, heart-outline ×1) have `aria-hidden="true"`.
3. [ ] All decorative `<ion-icon>` elements in `th-filter` (location, check-in calendar, check-out calendar, people, search) have `aria-hidden="true"`.
4. [ ] Both `<ion-icon name="notifications-outline">` elements in `th-navbar` (desktop + mobile) have `aria-hidden="true"`.
5. [ ] The `<ion-icon name="star">` in `th-badge` has `aria-hidden="true"`.
6. [ ] The `<ion-icon>` elements in `booking-detail` accordion buttons (close-circle ×1, chevron-down ×2, calendar ×1) all have `aria-hidden="true"`.
7. [ ] The `<ion-icon name="logo-google">` and `<ion-icon name="logo-facebook">` inside social sign-up buttons in `register.page.html` have `aria-hidden="true"`.

### Group 2 — Input Labels (CRIT-02, CRIT-03, MAJ-24)

8. [ ] `th-input` component generates unique `inputId` and `labelId` values; the `<label>` has `[for]="inputId"` and the `<ion-input>` has `[id]="inputId"` and `[attr.aria-labelledby]="labelId"`.
9. [ ] `th-filter` Location span has `id="th-filter-location-label"`; its `<ion-input>` has `aria-labelledby="th-filter-location-label"`. Same pattern applied to the Guests span/input using `id="th-filter-guests-label"`.
10. [ ] `th-payment-summary` Guests `<span>` label has `id="th-ps-guests-label"`; the `<ion-input>` has `aria-labelledby="th-ps-guests-label"`.

### Group 3 — Live Regions & Spinners (MAJ-07–14)

11. [ ] On `home.page.html`: the loading paragraph has `aria-live="polite" aria-atomic="true"`; the error paragraph has `role="alert" aria-live="assertive"`; the empty-state paragraph has `aria-live="polite" aria-atomic="true"`.
12. [ ] Same `aria-live` / `role="alert"` pattern applied to loading/error/empty paragraphs in `search-results.page.html`, `booking-list.page.html`, `propertydetail.page.html`, and `booking-detail.page.html`.
13. [ ] The `<ion-spinner>` inside the Sign In button on `login.page.html` has `aria-label="Signing in, please wait"`.
14. [ ] The `<ion-spinner>` inside the Create Account button on `register.page.html` has `aria-label="Creating account, please wait"`.
15. [ ] All four `<ion-spinner>` elements in `th-payment-summary` (admin reject, admin accept, primary compact, secondary compact) have `aria-label="Loading, please wait"`.

### Group 4 — Structure, Headings, Contrast & Viewport (MAJ-15–23, MIN-02, AXE-01–09)

16. [ ] `user_interface/src/index.html` viewport meta tag contains only `viewport-fit=cover, width=device-width, initial-scale=1.0` — `user-scalable=no`, `minimum-scale`, and `maximum-scale` are removed.
17. [ ] `th-hotel-card` price spans are wrapped in `aria-hidden="true"` with an adjacent `<span class="sr-only">` providing the concatenated price string; `.sr-only` utility class is added to the global stylesheet (`src/global.scss` or equivalent).
18. [ ] `th-hotel-card__price-label` uses `var(--th-neutral-700)` (7.0:1 on white); `th-hotel-card__price-suffix` uses `var(--th-neutral-700)`.
19. [ ] `home-section__subtitle` (`home.page.scss`) uses `var(--th-neutral-700)` instead of `var(--th-neutral-600)`.
20. [ ] Login and register card backgrounds use `--th-white` (or equivalent token) so all subtitle, link, and divider text passes 4.5:1 contrast.
21. [ ] `th-filter-summary` subtitle text on the blue card background passes 4.5:1 contrast.
22. [ ] `<ion-card aria-label="Login card">` on `login.page.html` has the `aria-label` removed; `<header class="login-card__header">` is changed to `<div class="login-card__header">`.
23. [ ] Same `aria-label` removal and `<header>→<div>` change applied to `register.page.html`.
24. [ ] `th-amenities-summary` uses `<h2>` (not `<h3>`) for "Amenities"; `th-property-review-summary` uses `<h2>` for "Guest Reviews" — heading hierarchy on property-detail and booking-detail is h1→h2.
25. [ ] `booking-list.page.html` has a visible or `.sr-only` `<h1>My Reservations</h1>`.
26. [ ] `search-results.page.html` has a visible or `.sr-only` `<h1>Search Results</h1>`.
27. [ ] Filter buttons inside `role="tablist"` on `booking-list.page.html` have `role="tab"` and `[attr.tabindex]` managed (0 for active, -1 for inactive); content panel has `role="tabpanel"` and `[attr.aria-labelledby]`.
28. [ ] `.th-input__icon-button:focus-visible` in `th-input.component.scss` has a visible focus ring (`box-shadow: 0 0 0 2px var(--th-primary-500)`).
29. [ ] Secondary `<ion-header>` elements (non-site-wide) have `role="none"` to prevent duplicate banner landmarks on travelhub pages.
30. [ ] `th-filter-summary` root element is `<section [attr.aria-label]="resolvedAlt || 'Search filters'">` (not `<ion-card role="img">`); pill button icons have `aria-hidden="true"`.

### Group 5 — Portal Hoteles (PH-MAJ-01–07, PH-AXE-01–04)

31. [ ] `portal-hoteles` login `<ion-card aria-label="Login card">` has `aria-label` removed; `<header class="login-card__header">` changed to `<div>`.
32. [ ] Portal-hoteles login `<ion-spinner>` has `aria-label="Signing in, please wait"`.
33. [ ] `dashboard.page.html` loading/error/empty paragraphs have `aria-live="polite"` / `role="alert"` annotations.
34. [ ] `dashboard-reservation.page.html` loading and error paragraphs have `aria-live="polite"` and `role="alert"` respectively.
35. [ ] Dashboard table uses semantic `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th scope="col">`, and `<td>` elements.
36. [ ] `reservation-overview-card` status paragraph has `role="status" aria-live="polite" aria-atomic="true"`.
37. [ ] `generic-card` uses `<h2>` (not `<h3>`) so dashboard heading hierarchy is h1→h2.
38. [ ] `portal-hoteles-side-nav__section-label` uses `var(--th-neutral-700)` (passes 4.5:1 on white).
39. [ ] `portal-hoteles/app.component.html`: outer `<main class="portal-hoteles-shell__content">` changed to `<div>`; outer `<header class="portal-hoteles-shell__header">` changed to `<div>`; outer `<aside class="portal-hoteles-shell__sidebar">` changed to `<div>`.

### Group 6 — Regression Guard (axe-core / Playwright)

40. [ ] `axe-core` and `@axe-core/playwright` are installed in `user_interface/` dev dependencies.
41. [ ] The travelhub Playwright E2E suite (`e2e/web/`) runs an axe scan on `/home`, `/login`, `/register`, and `/search-results`; the test fails if any violations are found for the rules fixed in this feature.
42. [ ] The portal-hoteles Playwright E2E suite (`e2e/web-portal-hoteles/`) runs an axe scan on `/login` and `/dashboard`; same failure condition.

---

## Affected Services

| Service | Language | Changes | Notes |
|---|---|---|---|
| `user_interface` (travelhub) | Angular 20 / Ionic 8 | Templates, SCSS, TypeScript — see Groups 1–4, 6 | Shared components affect both apps |
| `user_interface` (portal-hoteles) | Angular 20 / Ionic 8 | Templates, SCSS — see Group 5, 6 | `projects/portal-hoteles/` |

---

## API Contracts

None. All changes are frontend-only (HTML templates, SCSS, TypeScript component classes).

---

## Data Model Changes

None.

---

## Cross-Service Communication

None. All fixes are contained within `user_interface/`.

---

## Out of Scope

- All backend services (`booking`, `booking_orchestrator`, `pms`, `poc_properties`, `auth`, `notifications`, `PricingEngine`, `PricingOrchestator`)
- Native Android Espresso tests (WebView content is covered by Playwright scans above)
- Localization / internationalization (i18n)
- Audio/video media content
- PDF documents
- Postman collection changes
- Terraform / CI/CD pipeline changes (axe integration goes into the existing npm E2E scripts only)

---

## Open Questions

| # | Question | Resolution |
|---|---|---|
| 1 | AXE-04: Use `role="none"` (Option A) or `aria-label` disambiguation (Option B) for secondary `<ion-header>` elements? | **Option A** — `role="none"` on secondary headers |
| 2 | PH-MAJ-05: Semantic `<table>` (Option A) or ARIA `role="table"` (Option B) for dashboard table? | **Option A** — semantic `<table>` HTML |
| 3 | Where should the `.sr-only` utility class be added? | Global stylesheet (`src/global.scss`) |

---

## Notes

- Source of truth: `specs/a11y-report.md` — file paths, current code, and required fix code are documented per finding.
- Shared components under `user_interface/src/app/shared/components/` serve both apps; fixes there repair both simultaneously.
- The `th-input` ID-generation approach should use a module-level counter (e.g., `let nextId = 0`) rather than `inject(ChangeDetectorRef)` to keep the component framework-agnostic.
- All contrast ratios in this spec are calculated against the rendered background colors documented in the audit report.
