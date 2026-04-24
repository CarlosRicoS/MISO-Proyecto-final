# Technical Plan: WCAG 2.1 AA Accessibility Fixes — TravelHub & Portal Hoteles

**Based on:** `specs/a11y-wcag-aa-fixes/SPEC.md`  
**Created:** 2026-04-24

---

## Architecture Decisions

1. **th-input ID generation via module-level counter** — A simple `let nextId = 0` at TypeScript module scope generates collision-free IDs (`th-input-0`, `th-input-1`, …) without `inject()`, Zone.js, or lifecycle complexity. Counter is incremented in the constructor.

2. **Semantic `<table>` for dashboard (PH-MAJ-05, preferred Option A)** — Native HTML table semantics (`<thead>/<tbody>/<th scope="col">/<td>`) are more reliable across screen readers than ARIA roles. The existing `*ngIf` and `*ngFor` directives transfer directly to `<table>` and `<tr>` elements.

3. **`.sr-only` in `src/global.scss`** — One canonical definition in the Ionic global stylesheet avoids duplication. Portal-hoteles shares the same global SCSS via the Angular build config, so both apps benefit automatically.

4. **`<section>` root for th-filter-summary (AXE-09)** — `<ion-card role="img">` is replaced with `<section [attr.aria-label]="resolvedAlt || 'Search filters'">`. SCSS class `th-filter-summary` stays on the same root element; no style changes needed for the outer wrapper.

5. **Axe integration as new dedicated spec files** — Adding `e2e/web/a11y.spec.ts` and `e2e/web-portal-hoteles/a11y.spec.ts` keeps accessibility regression tests isolated. `@axe-core/playwright` is already installed (`^4.11.2`).

6. **Contrast fixes via token substitution only** — All contrast failures (`--th-neutral-500` and `--th-neutral-600`) are replaced with `--th-neutral-700` (`#495057`, 7.0:1 on white). No new color values or design tokens are introduced.

7. **Card background contrast fix: white background (Option A)** — Login and register card backgrounds switch from `--th-neutral-100` to `--th-white`. This resolves all five contrast failures on those surfaces in one change.

8. **`role="none"` on secondary `<ion-header>` elements (AXE-04, Option A)** — Any non-primary `<ion-header>` that appears on the same page as th-navbar gets `role="none"`. This must be applied per-page since Ionic auto-assigns `role="banner"` to every `<ion-header>`.

---

## Service Breakdown

### `user_interface` — travelhub app (Angular 20 / Ionic 8)

---

#### Group 1 — Button Names & Icons

**Pattern:** Add `aria-hidden="true"` to decorative icons; bind dynamic `[attr.aria-label]` on icon-only buttons.

**Files to modify:**

```
user_interface/src/app/shared/components/th-navbar/th-navbar.component.html
  — Line 72: bind [attr.aria-label]="isBookingList ? 'More options' : 'Add to favorites'"
  — Line 73: add aria-hidden="true" to the toggled ion-icon
  — Line 36: add aria-hidden="true" to desktop notifications icon
  — Line 83: add aria-hidden="true" to mobile notifications icon

user_interface/src/app/shared/components/th-hotel-card/th-hotel-card.component.html
  — Lines 21, 39: add aria-hidden="true" to location-outline icons
  — Line 7: add aria-hidden="true" to heart-outline icon in favorite button

user_interface/src/app/shared/components/th-filter/th-filter.component.html
  — Lines 10, 29, 50, 69: add aria-hidden="true" to location, calendar×2, people icons
  — Line 88: add aria-hidden="true" to search icon inside ion-button (has visible text)

user_interface/src/app/shared/components/th-badge/th-badge.component.html
  — Line 2: add aria-hidden="true" to the conditional ion-icon

user_interface/src/app/pages/booking-detail/booking-detail.page.html
  — Lines 88, 92, 133, 139: add aria-hidden="true" to accordion icons

user_interface/src/app/pages/register/register.page.html
  — Lines 127, 131: add aria-hidden="true" to logo-google and logo-facebook icons
```

---

#### Group 2 — Input Labels

**Pattern:** Programmatic label association via `for`/`id` and `aria-labelledby`.

**Files to modify:**

```
user_interface/src/app/shared/components/th-input/th-input.component.ts
  — Add module-level: let nextId = 0;
  — Add class properties: readonly inputId = `th-input-${nextId++}`;
                          readonly labelId  = `th-input-label-${nextId - 1}`;

user_interface/src/app/shared/components/th-input/th-input.component.html
  — Line 2: <label [for]="inputId" *ngIf="label" ...>
  — Line 10: add [id]="inputId" [attr.aria-labelledby]="label ? labelId : null"

user_interface/src/app/shared/components/th-filter/th-filter.component.html
  — Line 4: add id="th-filter-location-label" to location span
  — Line 11: add aria-labelledby="th-filter-location-label" to location ion-input
  — Line 63: add id="th-filter-guests-label" to guests span
  — Line 70: add aria-labelledby="th-filter-guests-label" to guests ion-input

user_interface/src/app/shared/components/th-payment-summary/th-payment-summary.component.html
  — Line 106: add id="th-ps-guests-label" to guests span
  — Line 111: add aria-labelledby="th-ps-guests-label" to guests ion-input
```

**Note on th-input ID counter:** The `inputId` and `labelId` are computed in a single counter increment. Use `readonly inputId = \`th-input-${nextId}\`; readonly labelId = \`th-input-label-${nextId++}\`;` to keep both IDs aligned from the same counter value.

---

#### Group 3 — Live Regions & Spinners

**Pattern:** Loading paragraphs get `aria-live="polite" aria-atomic="true"`; error paragraphs get `role="alert" aria-live="assertive"`; empty-state paragraphs get `aria-live="polite" aria-atomic="true"`; spinners get descriptive `aria-label`.

**Files to modify:**

```
user_interface/src/app/pages/home/home.page.html
  — Line 83: add aria-live="polite" aria-atomic="true" (loading)
  — Line 84: add role="alert" aria-live="assertive" (error)
  — Line 85: add aria-live="polite" aria-atomic="true" (empty)

user_interface/src/app/pages/search-results/search-results.page.html
  — Lines 47-49: same pattern as home (loading / error / empty)

user_interface/src/app/pages/booking-list/booking-list.page.html
  — Lines 64-66: same pattern (loading / error / emptyLabel)

user_interface/src/app/pages/propertydetail/propertydetail.page.html
  — Lines 104-105: add aria-live="polite" (loading) and role="alert" (error)

user_interface/src/app/pages/booking-detail/booking-detail.page.html
  — Lines 308-309: add aria-live="polite" (loading) and role="alert" (error)

user_interface/src/app/pages/login/login.page.html
  — Lines 60-64: add aria-label="Signing in, please wait" to ion-spinner

user_interface/src/app/pages/register/register.page.html
  — Lines 109-113: add aria-label="Creating account, please wait" to ion-spinner

user_interface/src/app/shared/components/th-payment-summary/th-payment-summary.component.html
  — All <ion-spinner> elements (admin reject, admin accept, primary compact, secondary compact):
    add aria-label="Loading, please wait" to each
```

---

#### Group 4 — Structure, Headings, Contrast & Viewport

**Files to modify:**

```
user_interface/src/index.html
  — Line 11: replace viewport meta with:
    <meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0" />

user_interface/src/global.scss
  — Append .sr-only utility class:
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

user_interface/src/app/shared/components/th-hotel-card/th-hotel-card.component.html
  — Lines 51-53 (booking variant) and 70-72 (default variant):
    Wrap price spans in <span aria-hidden="true"> and add adjacent <span class="sr-only">
    with concatenated price text (e.g., "From $120/night")

user_interface/src/app/shared/components/th-hotel-card/th-hotel-card.component.scss
  — .th-hotel-card__price-label: color: var(--th-neutral-500) → var(--th-neutral-700)
  — .th-hotel-card__price-suffix: color: var(--th-neutral-600) → var(--th-neutral-700)

user_interface/src/app/pages/home/home.page.scss
  — .home-section__subtitle: color: var(--th-neutral-600) → var(--th-neutral-700)

user_interface/src/app/pages/login/login.page.html
  — Line 20: remove aria-label="Login card" from <ion-card>
  — Line 22: <header class="login-card__header"> → <div class="login-card__header">
  — Line 27: close </header> → </div>

user_interface/src/app/pages/login/login.page.scss
  — .login-card: background from var(--th-neutral-100) → var(--th-white) (or equivalent white token)

user_interface/src/app/pages/register/register.page.html
  — Line 13: remove aria-label="Register card" from <ion-card>
  — Line 29: <header class="register-form__header"> → <div class="register-form__header">
  — Close </header> → </div>

user_interface/src/app/pages/register/register.page.scss
  — .register-card: background from var(--th-neutral-100) → var(--th-white) (or equivalent)

user_interface/src/app/shared/components/th-amenities-summary/th-amenities-summary.component.html
  — Line 2: <h3 class="th-amenities-summary__title"> → <h2 ...>

user_interface/src/app/shared/components/th-property-review-summary/th-property-review-summary.component.html
  — Line 3: <h3 class="th-property-review-summary__title"> → <h2 ...>

user_interface/src/app/pages/booking-list/booking-list.page.html
  — Line 1 (inside ion-content): add <h1 class="sr-only">My Reservations</h1>
  — Lines 5-14: add role="tab" and [attr.tabindex]="isFilterActive(filter.key) ? 0 : -1" to each button
  — After the filter div (line 15): add role="tabpanel" aria-label and [attr.aria-labelledby] to content panel

user_interface/src/app/pages/search-results/search-results.page.html
  — Add <h1 class="sr-only">Search Results</h1> inside the main content area

user_interface/src/app/shared/components/th-input/th-input.component.scss
  — Add after .th-input__icon-button:disabled rule:
    .th-input__icon-button:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px var(--th-primary-500);
      border-radius: var(--th-radius-sm);
    }

user_interface/src/app/shared/components/th-filter-summary/th-filter-summary.component.html
  — Line 1: <ion-card ... role="img" [attr.aria-label]="resolvedAlt"> →
            <section class="th-filter-summary" [attr.aria-label]="resolvedAlt || 'Search filters'">
  — Remove <ion-card-content> wrapper (keep inner content, adjust class if needed)
  — Line 31: closing </ion-card> → </section>
  — Lines 20-22: add aria-hidden="true" to both pill button icons

user_interface/src/app/shared/components/th-filter-summary/th-filter-summary.component.scss
  — .th-filter-summary__top-subtitle: verify contrast on blue background
    Change text color to pass 4.5:1 on the rendered card background

user_interface/src/app/pages/home/home.page.html (AXE-04)
  — Scan for any secondary <ion-header> (non-th-navbar); add role="none" if found
  — Same scan for search-results.page.html and booking-list.page.html
```

---

### `user_interface` — portal-hoteles app

#### Group 5 — Portal Hoteles Fixes

**Files to modify:**

```
user_interface/projects/portal-hoteles/src/app/app.component.html
  — Line 4: <header class="portal-hoteles-shell__header"> → <div ...>
  — Line 9: <aside class="portal-hoteles-shell__sidebar"> → <div ...>
  — Line 14: <main class="portal-hoteles-shell__content"> → <div ...>
  — Close matching </header> → </div>, </aside> → </div>, </main> → </div>

user_interface/projects/portal-hoteles/src/app/pages/login/login.page.html
  — Line 20: remove aria-label="Login card" from <ion-card>
  — Line 22: <header class="login-card__header"> → <div class="login-card__header">
  — Line 27: close </header> → </div>
  — Lines 60-64: add aria-label="Signing in, please wait" to ion-spinner

user_interface/projects/portal-hoteles/src/app/pages/login/login.page.scss
  — .login-card: background from --th-neutral-100 → --th-white (AXE-05 extension)

user_interface/projects/portal-hoteles/src/app/pages/dashboard/dashboard.page.html
  — Lines 115-123 (#reservationsFallback):
    Loading paragraph: add aria-live="polite" aria-atomic="true"
    Error paragraph: add role="alert"
  — Lines 43-99 (table area): convert to semantic <table>:
    <table class="portal-hoteles-dashboard-table">
      <thead>
        <tr>
          <th scope="col">Booking ID</th>
          <th scope="col">Guest Name</th>
          <th scope="col">Check-in</th>
          <th scope="col">Check-out</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let reservation of visibleReservations">
          <td>... booking link ...</td>
          <td>... guest info ...</td>
          <td>{{ reservation.checkInLabel }}</td>
          <td>{{ reservation.checkOutLabel }}</td>
          <td [class]="getStatusClass(reservation.statusLabel)">{{ reservation.statusLabel }}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr><td colspan="5">... pagination footer ...</td></tr>
      </tfoot>
    </table>

user_interface/projects/portal-hoteles/src/app/pages/dashboard-reservation/dashboard-reservation.page.html
  — Line 45: @if (isLoading) paragraph: add aria-live="polite" aria-atomic="true"
  — Line 49: @if (errorMessage) paragraph: add role="alert"

user_interface/src/app/shared/components/portal-hoteles/generic-card/generic-card.component.html
  — Line 4: <h3 *ngIf="title"> → <h2 *ngIf="title">

user_interface/src/app/shared/components/portal-hoteles/reservation-overview-card/portal-hoteles-reservation-overview-card.component.html
  — Line 32: <p [class]="statusClass"> →
             <p [class]="statusClass" role="status" aria-live="polite" aria-atomic="true">

user_interface/src/app/shared/components/portal-hoteles/side-nav/portal-hoteles-side-nav.component.scss
  — .portal-hoteles-side-nav__section-label: color from --th-neutral-500 → --th-neutral-700
```

---

#### Group 6 — Regression Guard (axe-core / Playwright)

**`@axe-core/playwright` is already installed** (`^4.11.2` in devDependencies). No `npm install` needed.

**Files to create:**

```
user_interface/e2e/web/a11y.spec.ts
  — axe scan on /home, /login, /register, /search-results
  — Use AxeBuilder from @axe-core/playwright
  — Import and route-navigate in beforeEach, run analyze() per page
  — Assert violations.length === 0 with descriptive failure message

user_interface/e2e/web-portal-hoteles/a11y.spec.ts
  — axe scan on /login and /dashboard (authenticated)
  — Same pattern; auth flow via WireMock or direct cookie injection (follow existing portal auth spec pattern from portal-auth-flow.spec.ts)
```

**Files to modify:**

```
user_interface/playwright-portal-hoteles.config.ts  (if separate config exists)
  — Confirm testDir covers e2e/web-portal-hoteles/ (likely already does)
```

---

## Interface Contracts

No service-to-service calls. No new API endpoints.

---

## Cross-Service Dependency Diagram

```
user_interface (Angular 20 / Ionic 8)
  ├── src/app/shared/components/   (shared by both apps)
  │   ├── th-input                  (Group 1, 2, 3, 4)
  │   ├── th-filter                 (Group 1, 2)
  │   ├── th-navbar                 (Group 1)
  │   ├── th-hotel-card             (Group 1, 4)
  │   ├── th-badge                  (Group 1)
  │   ├── th-payment-summary        (Group 2, 3)
  │   ├── th-filter-summary         (Group 4)
  │   ├── th-amenities-summary      (Group 4 — h2 fix)
  │   ├── th-property-review-summary (Group 4 — h2 fix)
  │   └── portal-hoteles/*          (Group 5)
  ├── src/app/pages/               (travelhub pages)
  │   ├── home, login, register, search-results (Groups 3, 4)
  │   ├── booking-list, booking-detail, propertydetail (Groups 1, 3, 4)
  └── projects/portal-hoteles/     (portal-hoteles pages + shell)
      ├── app.component.html        (Group 5 — landmark restructure)
      └── pages/login, dashboard, dashboard-reservation (Group 5)
```

---

## Risk Flags

- **th-filter-summary `<ion-card>` → `<section>` may break styles** — `ion-card` applies Ionic shadow DOM styles (elevation, padding, border-radius) that a plain `<section>` will not inherit. The SCSS class `th-filter-summary` must carry all visual styling explicitly. Check `th-filter-summary.component.scss` and move any `ion-card`-dependent styles to the host class.

- **Portal-hoteles dashboard table — colspan in tfoot** — The `<tfoot>` footer spans all 5 columns. Confirm `colspan="5"` renders correctly with the existing pagination CSS (`.portal-hoteles-dashboard-table__footer` styles).

- **th-input ID counter and SSR** — If Angular SSR is ever enabled, module-level counters reset per request. This is not a current risk (no SSR in this app), but note it as a future concern.

- **register.page.html `<header>` inside `<section>`** — A `<header>` inside a `<section>` becomes a section-scoped landmark. Changing to `<div>` removes the landmark; ensure no CSS is keyed to the `header` element tag (only class is used, so safe).

- **AXE-04 secondary banner scan** — The plan notes scanning page templates for secondary `<ion-header>` elements. This must be verified against the rendered DOM, not just the template, because Ionic components render additional headers in shadow DOM during complex date-picker modals. If no secondary `<ion-header>` is found in templates, this finding may be a runtime-only issue requiring the test-engineer to confirm.

---

## Implementation Order

1. **Group 2 first** (`th-input`, `th-filter`, `th-payment-summary` label fixes) — these are standalone component changes with no template dependencies.
2. **Group 1** (aria-hidden on icons) — pure attribute additions, zero logic.
3. **Group 3** (live regions + spinner labels) — attribute additions on existing elements.
4. **Group 4** (structure, headings, contrast, viewport) — more structural; `src/global.scss` `.sr-only` must be added before `th-hotel-card` uses it.
5. **Group 5** (portal-hoteles) — after shared components are fixed (shared fixes propagate automatically).
6. **Group 6** (axe regression specs) — last, after all fixes are in place; specs should find zero violations.
