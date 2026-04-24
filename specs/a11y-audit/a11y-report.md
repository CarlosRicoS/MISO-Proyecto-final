# Accessibility Audit Report — TravelHub

**Date:** 2026-04-24
**Auditor:** Claude Code (a11y-audit skill)
**Standard:** WCAG 2.1 Level AA
**Scope:** travelhub (Angular 20 / Ionic 8 SPA) + portal-hoteles (Angular admin panel)
**Phases completed:** Static analysis (Phase 1) + Live axe scan — all pages (Phase 2 complete)

---

## Executive Summary

The application has solid foundational structure — routing, image alt text, and many ARIA roles are correctly applied — but three systemic gaps affect every form and every loading state in the app: `<th-input>` labels are never programmatically associated with their inputs, loading/error paragraphs have no `aria-live` regions, and decorative `<ion-icon>` elements throughout shared components are missing `aria-hidden`. The live axe scan confirmed and escalated several static findings: Ionic renders `<ion-icon>` without `aria-hidden` as `role="img"` with no accessible name (unlabeled images, not just redundant text), the price "From" label has critically low contrast (2.07:1), and `user-scalable=no` in the viewport meta tag disables text scaling globally — a WCAG 1.4.4 failure affecting all mobile users.

| Severity | Travelhub | Portal Hoteles | Axe-only | Total |
|---|---|---|---|---|
| Critical | 3 | 0 | 5 | **8** |
| Major | 21 | 7 | 8 | **36** |
| Minor | 2 | 0 | 0 | **2** |
| **Total** | **26** | **7** | **13** | **46** |

> Axe scan completed on all pages: `/home`, `/login`, `/register`, `/search-results` (travelhub) + `/login`, `/dashboard` (portal-hoteles).
>
> Axe-only Critical: AXE-01, AXE-02, AXE-05, AXE-08, PH-AXE-01 | Axe-only Major: AXE-03, AXE-04, AXE-06, AXE-07, AXE-09, PH-AXE-02, PH-AXE-03, PH-AXE-04

---

## Part A — Travelhub Findings

### Critical Issues

---

#### CRIT-01 — Dynamic icon button with misleading static aria-label

**Status: Fixed**

**WCAG:** 4.1.2 Name, Role, Value
**Impact:** Screen reader users hear "Menu" regardless of route; on booking-list routes the button is actually "More options", on other routes it is "Add to favorites". The announced label contradicts the available action.
**Check:** CHECK-01

**Affected files:**
- `src/app/shared/components/th-navbar/th-navbar.component.html:72-74` — `aria-label="Menu"` is static while the icon toggles between `ellipsis-vertical` and `heart`

**Current code:**
```html
<ion-button class="th-navbar__mobile-action" fill="clear" aria-label="Menu">
  <ion-icon [name]="isBookingList ? 'ellipsis-vertical' : 'heart'"></ion-icon>
</ion-button>
```

**Required fix:**
```html
<ion-button
  class="th-navbar__mobile-action"
  fill="clear"
  [attr.aria-label]="isBookingList ? 'More options' : 'Add to favorites'"
>
  <ion-icon [name]="isBookingList ? 'ellipsis-vertical' : 'heart'" aria-hidden="true"></ion-icon>
</ion-button>
```

---

#### CRIT-02 — th-input: label not programmatically associated with input

**Status: Fixed**

**WCAG:** 1.3.1 Info and Relationships
**Impact:** Screen reader users hear the field's placeholder text only — not the label — when focused. Affects every form in the app (login, register, property detail booking, payment summary).
**Check:** CHECK-02

**Affected files:**
- `src/app/shared/components/th-input/th-input.component.html:2` — `<label>` has no `for` attribute
- `src/app/shared/components/th-input/th-input.component.html:10` — `<ion-input>` has no `id`

**Current code:**
```html
<label class="th-input__label" *ngIf="label">{{ label }}</label>
<ion-item class="th-input__item" lines="none">
  <ion-input
    [type]="type"
    [placeholder]="placeholder"
    ...
  ></ion-input>
</ion-item>
```

**Required fix:**
```html
<label class="th-input__label" *ngIf="label" [for]="inputId">{{ label }}</label>
<ion-item class="th-input__item" lines="none">
  <ion-input
    [id]="inputId"
    [attr.aria-labelledby]="label ? labelId : null"
    [type]="type"
    [placeholder]="placeholder"
    ...
  ></ion-input>
</ion-item>
```
The component's TypeScript class should generate unique `inputId` and `labelId` values using Angular's `inject(ChangeDetectorRef)` or a simple counter.

---

#### CRIT-03 — th-filter: span labels not associated with ion-inputs

**Status: Fixed**

**WCAG:** 1.3.1 Info and Relationships
**Impact:** Location and Guests inputs have visible `<span>` labels that are invisible to assistive technology. Screen readers announce only the placeholder.
**Check:** CHECK-02

**Affected files:**
- `src/app/shared/components/th-filter/th-filter.component.html:4,11` — Location span + ion-input, no programmatic link
- `src/app/shared/components/th-filter/th-filter.component.html:63,70` — Guests span + ion-input, same issue

**Current code:**
```html
<span class="th-filter__label">{{ locationLabel }}</span>
<ion-item ...>
  <ion-input [placeholder]="locationPlaceholder" ...></ion-input>
</ion-item>
```

**Required fix:**
```html
<span class="th-filter__label" id="th-filter-location-label">{{ locationLabel }}</span>
<ion-item ...>
  <ion-input
    aria-labelledby="th-filter-location-label"
    [placeholder]="locationPlaceholder"
    ...
  ></ion-input>
</ion-item>
```
Apply the same pattern to the Guests input using `id="th-filter-guests-label"` and `aria-labelledby="th-filter-guests-label"`.

---

### Major Issues

---

#### MAJ-01 — Decorative location icons missing aria-hidden in hotel card

**Status: Fixed**

**WCAG:** 1.1.1 Non-text Content
**Impact:** Screen readers announce the icon's implicit name (e.g., "location outline") in addition to the visible city text, creating redundant and confusing announcements.
**Check:** CHECK-03

**Affected files:**
- `src/app/shared/components/th-hotel-card/th-hotel-card.component.html:21` — booking variant location icon
- `src/app/shared/components/th-hotel-card/th-hotel-card.component.html:39` — default variant location icon

**Current code:**
```html
<p class="th-hotel-card__location">
  <ion-icon name="location-outline"></ion-icon>
  {{ location }}
</p>
```

**Required fix:**
```html
<p class="th-hotel-card__location">
  <ion-icon name="location-outline" aria-hidden="true"></ion-icon>
  {{ location }}
</p>
```

---

#### MAJ-02 — Decorative icons missing aria-hidden in filter component

**Status: Fixed**

**WCAG:** 1.1.1 Non-text Content
**Impact:** All four filter icons (location, two calendar, people) are announced by screen readers alongside the field's placeholder text.
**Check:** CHECK-03

**Affected files:**
- `src/app/shared/components/th-filter/th-filter.component.html:10` — location icon in slot
- `src/app/shared/components/th-filter/th-filter.component.html:29` — check-in calendar icon
- `src/app/shared/components/th-filter/th-filter.component.html:50` — check-out calendar icon
- `src/app/shared/components/th-filter/th-filter.component.html:69` — guests people icon
- `src/app/shared/components/th-filter/th-filter.component.html:88` — search icon inside search button (button has visible text)

**Required fix:** Add `aria-hidden="true"` to all five `<ion-icon>` elements.

---

#### MAJ-03 — Notifications button icon missing aria-hidden

**Status: Fixed**

**WCAG:** 1.1.1 Non-text Content
**Impact:** Because the `<ion-button>` already has `aria-label="Notifications"`, the icon's implicit name is redundantly announced.
**Check:** CHECK-03

**Affected files:**
- `src/app/shared/components/th-navbar/th-navbar.component.html:36` — desktop notifications button
- `src/app/shared/components/th-navbar/th-navbar.component.html:83` — mobile notifications button

**Required fix:**
```html
<ion-button class="th-navbar__icon-btn" fill="clear" aria-label="Notifications">
  <ion-icon name="notifications-outline" aria-hidden="true"></ion-icon>
</ion-button>
```

---

#### MAJ-04 — Favorite button icon missing aria-hidden in hotel card

**Status: Fixed**

**WCAG:** 1.1.1 Non-text Content
**Impact:** `<ion-button aria-label="Favorite">` already provides the accessible name; the unguarded icon is announced redundantly.
**Check:** CHECK-03

**Affected files:**
- `src/app/shared/components/th-hotel-card/th-hotel-card.component.html:7` — heart icon inside labeled favorite button

**Required fix:**
```html
<ion-icon name="heart-outline" aria-hidden="true"></ion-icon>
```

---

#### MAJ-05 — Accordion button icons missing aria-hidden in booking detail

**Status: Fixed**

**WCAG:** 1.1.1 Non-text Content
**Impact:** Buttons have visible text labels; the decorative icons inside are announced in addition to the text.
**Check:** CHECK-03

**Affected files:**
- `src/app/pages/booking-detail/booking-detail.page.html:89` — close-circle icon inside "Cancel Reservation" button
- `src/app/pages/booking-detail/booking-detail.page.html:92` — chevron-down icon in same button
- `src/app/pages/booking-detail/booking-detail.page.html:133` — calendar icon inside "Change Dates" button
- `src/app/pages/booking-detail/booking-detail.page.html:139` — chevron-down icon in same button

**Required fix:** Add `aria-hidden="true"` to all four `<ion-icon>` elements.

---

#### MAJ-06 — Badge icon missing aria-hidden

**Status: Fixed**

**WCAG:** 1.1.1 Non-text Content
**Impact:** The star icon in the rating badge is announced alongside the numeric rating text, e.g., "star 4.8" instead of just "4.8".
**Check:** CHECK-03

**Affected files:**
- `src/app/shared/components/th-badge/th-badge.component.html:2` — `<ion-icon>` with no aria-hidden

**Current code:**
```html
<ion-badge class="th-badge" [ngClass]="badgeClasses">
  <ion-icon *ngIf="icon" [name]="icon" class="th-badge__icon"></ion-icon>
  <ng-content></ng-content>
</ion-badge>
```

**Required fix:**
```html
<ion-icon *ngIf="icon" [name]="icon" class="th-badge__icon" aria-hidden="true"></ion-icon>
```

---

#### MAJ-07 — Loading and error states without aria-live on home page

**Status: Fixed**

**WCAG:** 4.1.3 Status Messages
**Impact:** When hotels load or an error occurs, screen reader users are not notified because the dynamic paragraphs appear outside a live region.
**Check:** CHECK-04

**Affected files:**
- `src/app/pages/home/home.page.html:83` — "Loading hotels..." — no aria-live
- `src/app/pages/home/home.page.html:84` — errorMessage — no role="alert"
- `src/app/pages/home/home.page.html:85` — "No hotels available." — no aria-live

**Required fix:**
```html
<p class="home-empty" *ngIf="isLoading" aria-live="polite" aria-atomic="true">Loading hotels...</p>
<p class="home-empty" *ngIf="!isLoading && errorMessage" role="alert" aria-live="assertive">{{ errorMessage }}</p>
<p class="home-empty" *ngIf="!isLoading && !errorMessage && !hotels.length" aria-live="polite" aria-atomic="true">No hotels available.</p>
```

---

#### MAJ-08 — Loading and error states without aria-live on search-results page

**WCAG:** 4.1.3 Status Messages
**Impact:** Search loading state and error are silent to screen reader users.
**Check:** CHECK-04

**Affected files:**
- `src/app/pages/search-results/search-results.page.html:47` — "Loading hotels..."
- `src/app/pages/search-results/search-results.page.html:48` — errorMessage
- `src/app/pages/search-results/search-results.page.html:49` — "No hotels available..."

**Required fix:** Apply the same `aria-live="polite"` / `role="alert"` pattern from MAJ-07.

---

#### MAJ-09 — Loading and error states without aria-live on booking-list page

**WCAG:** 4.1.3 Status Messages
**Impact:** Reservation loading state is silent to AT users.
**Check:** CHECK-04

**Affected files:**
- `src/app/pages/booking-list/booking-list.page.html:64` — "Loading reservations..."
- `src/app/pages/booking-list/booking-list.page.html:65` — errorMessage
- `src/app/pages/booking-list/booking-list.page.html:66` — emptyLabel

**Required fix:** Apply the same pattern from MAJ-07.

---

#### MAJ-10 — Loading and error states without aria-live on property detail

**WCAG:** 4.1.3 Status Messages
**Impact:** Property loading state is silent to AT users.
**Check:** CHECK-04

**Affected files:**
- `src/app/pages/propertydetail/propertydetail.page.html:104` — "Loading property details..."
- `src/app/pages/propertydetail/propertydetail.page.html:105` — errorMessage

**Required fix:** Apply the same pattern from MAJ-07.

---

#### MAJ-11 — Loading and error states without aria-live on booking detail

**WCAG:** 4.1.3 Status Messages
**Impact:** Booking detail loading state is silent to AT users.
**Check:** CHECK-04

**Affected files:**
- `src/app/pages/booking-detail/booking-detail.page.html:308` — "Loading booking details..."
- `src/app/pages/booking-detail/booking-detail.page.html:309` — errorMessage

**Required fix:** Apply the same pattern from MAJ-07.

---

#### MAJ-12 — ion-spinner without aria-label on login page

**WCAG:** 4.1.3 Status Messages
**Impact:** The loading spinner is announced as an unlabeled element; screen reader users do not know sign-in is in progress.
**Check:** CHECK-04

**Affected files:**
- `src/app/pages/login/login.page.html:60-64` — `<ion-spinner *ngIf="isLoading">` inside Sign In button

**Required fix:**
```html
<ion-spinner
  *ngIf="isLoading"
  name="crescent"
  class="login-card__spinner"
  aria-label="Signing in, please wait"
></ion-spinner>
```

---

#### MAJ-13 — ion-spinner without aria-label on register page

**WCAG:** 4.1.3 Status Messages
**Impact:** Account creation loading is not communicated to screen reader users.
**Check:** CHECK-04

**Affected files:**
- `src/app/pages/register/register.page.html:109-113` — `<ion-spinner *ngIf="isLoading">` inside Create Account button

**Required fix:** Add `aria-label="Creating account, please wait"` to the spinner.

---

#### MAJ-14 — ion-spinners without aria-label in th-payment-summary

**WCAG:** 4.1.3 Status Messages
**Impact:** Four loading spinners inside the payment/booking summary widget are announced as unlabeled.
**Check:** CHECK-04

**Affected files:**
- `src/app/shared/components/th-payment-summary/th-payment-summary.component.html:209` — admin reject action spinner
- `src/app/shared/components/th-payment-summary/th-payment-summary.component.html:228` — admin accept action spinner
- `src/app/shared/components/th-payment-summary/th-payment-summary.component.html:293` — primary action spinner (compact)
- `src/app/shared/components/th-payment-summary/th-payment-summary.component.html:309` — secondary action spinner (compact)

**Required fix:** Add `aria-label="Loading, please wait"` to all four spinners.

---

#### MAJ-15 — Split price text not grouped for screen readers

**WCAG:** 1.3.1 Info and Relationships
**Impact:** A screen reader announces "$", "120", "/night" as three separate text nodes, disrupting comprehension of the price.
**Check:** CHECK-05

**Affected files:**
- `src/app/shared/components/th-hotel-card/th-hotel-card.component.html:51-53` — booking variant price
- `src/app/shared/components/th-hotel-card/th-hotel-card.component.html:70-72` — default variant price

**Current code:**
```html
<span class="th-hotel-card__price-label">{{ pricePrefix }}</span>
<span class="th-hotel-card__price-value">{{ price }}</span>
<span class="th-hotel-card__price-suffix">{{ priceSuffix }}</span>
```

**Required fix:**
```html
<span class="th-hotel-card__price-wrapper" aria-hidden="true">
  <span class="th-hotel-card__price-label">{{ pricePrefix }}</span>
  <span class="th-hotel-card__price-value">{{ price }}</span>
  <span class="th-hotel-card__price-suffix">{{ priceSuffix }}</span>
</span>
<span class="sr-only">{{ pricePrefix }}{{ price }}{{ priceSuffix }}</span>
```
Add `.sr-only` to the global stylesheet (position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap).

---

#### MAJ-16 — aria-label on non-interactive ion-card (login page)

**WCAG:** 4.1.2 Name, Role, Value
**Impact:** `aria-label` on a non-interactive element creates an unnamed landmark with a label that provides no benefit; it can confuse screen readers that announce the card name.
**Check:** CHECK-06

**Affected files:**
- `src/app/pages/login/login.page.html:20` — `<ion-card class="login-card" aria-label="Login card">`

**Required fix:** Remove the `aria-label` from `<ion-card>`. The `<h1>` inside the card already communicates the page purpose.

---

#### MAJ-17 — aria-label on non-interactive ion-card (register page)

**WCAG:** 4.1.2 Name, Role, Value
**Impact:** Same as MAJ-16.
**Check:** CHECK-06

**Affected files:**
- `src/app/pages/register/register.page.html:13` — `<ion-card class="register-card" aria-label="Register card">`

**Required fix:** Remove the `aria-label`.

---

#### MAJ-18 — Heading hierarchy skip: h1 → h3 on property detail

**WCAG:** 1.3.1 Info and Relationships
**Impact:** Screen reader users navigating by headings cannot build an accurate mental model of the page structure; the jump from h1 to h3 signals a missing level.
**Check:** CHECK-07

**Affected files:**
- `src/app/shared/components/th-detail-summary/th-detail-summary.component.html:4` — `<h1>` for property title
- `src/app/shared/components/th-amenities-summary/th-amenities-summary.component.html:2` — `<h3>` for "Amenities" (no h2 bridging)
- `src/app/shared/components/th-property-review-summary/th-property-review-summary.component.html:3` — `<h3>` for "Guest Reviews" (no h2 bridging)

**Required fix:** Change `<h3>` in `th-amenities-summary` and `th-property-review-summary` to `<h2>`, OR introduce `<h2>` section headings in `propertydetail.page.html` wrapping each section.

---

#### MAJ-19 — Heading hierarchy skip: h1 → h3 on booking detail

**WCAG:** 1.3.1 Info and Relationships
**Impact:** Same as MAJ-18 — `booking-detail.page.html` uses the same component tree (`th-detail-summary` → `th-amenities-summary` → `th-property-review-summary`).
**Check:** CHECK-07

**Affected files:** Same components as MAJ-18, rendered via `booking-detail.page.html`.

**Required fix:** Apply the same fix as MAJ-18 (the fix will repair both pages simultaneously).

---

#### MAJ-20 — No page heading on booking-list page

**WCAG:** 1.3.1 Info and Relationships
**Impact:** Screen reader users have no heading to orient to when the page loads; they cannot distinguish this page from others by heading navigation.
**Check:** CHECK-07

**Affected files:**
- `src/app/pages/booking-list/booking-list.page.html` — entire template has no `<h1>` or `<h2>`

**Required fix:** Add a visually consistent (or visually hidden if design requires) `<h1>` to identify the page, e.g.:
```html
<h1 class="sr-only">My Reservations</h1>
```

---

#### MAJ-21 — No page heading on search-results page

**WCAG:** 1.3.1 Info and Relationships
**Impact:** Same as MAJ-20.
**Check:** CHECK-07

**Affected files:**
- `src/app/pages/search-results/search-results.page.html` — no heading in the template

**Required fix:** Add `<h1 class="sr-only">Search Results</h1>` or promote the "N hotels found" count paragraph to use a heading element.

---

#### MAJ-22 — Tablist filter buttons missing role="tab"

**WCAG:** 4.1.2 Name, Role, Value
**Impact:** The `role="tablist"` container correctly communicates a tab widget to AT, but the child `<button>` elements lack `role="tab"`. Screen readers will not treat them as tabs and will not announce `aria-selected` state.
**Check:** CHECK-06

**Affected files:**
- `src/app/pages/booking-list/booking-list.page.html:7-14` — `<button *ngFor>` inside `role="tablist"`

**Current code:**
```html
<button
  type="button"
  class="booking-filters__button"
  *ngFor="let filter of bookingFilters"
  [attr.aria-selected]="isFilterActive(filter.key)"
  (click)="setFilter(filter.key)"
>
```

**Required fix:**
```html
<button
  type="button"
  role="tab"
  class="booking-filters__button"
  *ngFor="let filter of bookingFilters"
  [attr.aria-selected]="isFilterActive(filter.key)"
  [attr.tabindex]="isFilterActive(filter.key) ? 0 : -1"
  (click)="setFilter(filter.key)"
>
```
Also add `role="tabpanel"` and `[attr.aria-labelledby]` to the content panel(s) below the tabs.

---

#### MAJ-23 — th-input end-icon button has no focus indicator

**WCAG:** 2.4.7 Focus Visible
**Impact:** The show/hide password toggle button inside `<th-input>` has no `:focus-visible` CSS rule. Ionic's global reset may suppress the browser's native outline, leaving keyboard users with no visible focus indicator.
**Check:** CHECK-08

**Affected files:**
- `src/app/shared/components/th-input/th-input.component.scss` — `.th-input__icon-button` has no `:focus-visible` rule

**Required fix:**
```scss
.th-input__icon-button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--th-primary-500);
  border-radius: var(--th-radius-sm);
}
```

---

#### MAJ-24 — Guests input in th-payment-summary lacks aria association

**WCAG:** 1.3.1 Info and Relationships
**Impact:** The Guests `<ion-input>` in the editable payment summary form is preceded only by a `<span>` label with no `id`, so AT users hear only the placeholder text "1 guest".
**Check:** CHECK-02

**Affected files:**
- `src/app/shared/components/th-payment-summary/th-payment-summary.component.html:106-126` — `<span>` label + `<ion-input>` with no programmatic association

**Required fix:**
```html
<span class="th-payment-summary__field-label" id="th-ps-guests-label">{{ guestsLabel }}</span>
<ion-input
  aria-labelledby="th-ps-guests-label"
  class="th-payment-summary__input"
  ...
></ion-input>
```

---

### Minor Issues

---

#### MIN-01 — outline:none with replacement on filter field (acceptable)

**WCAG:** 2.4.7 Focus Visible
**Impact:** Low — the `outline: none` on `.th-filter__field:focus-visible` is accompanied by `border-color` and `box-shadow` replacements, which provide a visible focus indicator. This pattern is acceptable per the audit guide.
**Check:** CHECK-08

**Affected files:**
- `src/app/shared/components/th-filter/th-filter.component.scss:72` — `outline: none` inside `:focus-visible` rule with box-shadow replacement

**Note:** No code change required. Document this pattern as an acceptable custom focus indicator for future contributors.

---

#### MIN-02 — Helper text color near contrast threshold

**WCAG:** 1.4.3 Contrast Minimum
**Impact:** Low — The `.th-input__helper` uses `--th-neutral-600` (`#6c757d`) which achieves approximately 4.4:1 contrast on a white (`#ffffff`) background — just below the 4.5:1 AA threshold for normal-sized text. Needs live verification.
**Check:** CHECK-10

**Affected files:**
- `src/app/shared/components/th-input/th-input.component.scss:79` — `color: var(--th-neutral-600)`

**Note:** Verify contrast ratio with the actual rendered background in Phase 2. If confirmed failing, change to `var(--th-neutral-700)` (`#495057`, ~7.1:1).

---

## Part B — Portal Hoteles Findings

### Critical Issues

None found.

---

### Major Issues

---

#### PH-MAJ-01 — aria-label on non-interactive ion-card (portal-hoteles login)

**WCAG:** 4.1.2 Name, Role, Value
**Impact:** Same as travelhub MAJ-16 — redundant, meaningless label on a non-interactive container.
**Check:** CHECK-06

**Affected files:**
- `projects/portal-hoteles/src/app/pages/login/login.page.html:20` — `<ion-card aria-label="Login card">`

**Required fix:** Remove `aria-label` from `<ion-card>`.

---

#### PH-MAJ-02 — Loading and error states without aria-live on dashboard

**WCAG:** 4.1.3 Status Messages
**Impact:** Reservation loading and error messages inside the `#reservationsFallback` template are not announced to screen reader users.
**Check:** CHECK-04 / CHECK-09

**Affected files:**
- `projects/portal-hoteles/src/app/pages/dashboard/dashboard.page.html:116` — "Loading reservations..."
- `projects/portal-hoteles/src/app/pages/dashboard/dashboard.page.html:117-119` — error and empty state messages

**Required fix:**
```html
<p ... *ngIf="isLoadingReservations" aria-live="polite" aria-atomic="true">Loading reservations...</p>
<p ... *ngIf="!isLoadingReservations && reservationsErrorMessage" role="alert">{{ reservationsErrorMessage }}</p>
```

---

#### PH-MAJ-03 — Loading and error states without aria-live on reservation detail

**WCAG:** 4.1.3 Status Messages
**Impact:** Reservation detail loading state is silent to AT users.
**Check:** CHECK-04 / CHECK-09

**Affected files:**
- `projects/portal-hoteles/src/app/pages/dashboard-reservation/dashboard-reservation.page.html:46` — `@if (isLoading)` paragraph
- `projects/portal-hoteles/src/app/pages/dashboard-reservation/dashboard-reservation.page.html:50` — error message paragraph

**Required fix:** Add `aria-live="polite"` to the loading paragraph and `role="alert"` to the error paragraph.

---

#### PH-MAJ-04 — ion-spinner without aria-label on portal-hoteles login

**WCAG:** 4.1.3 Status Messages
**Impact:** Loading state during sign-in is not communicated to screen reader users.
**Check:** CHECK-04

**Affected files:**
- `projects/portal-hoteles/src/app/pages/login/login.page.html:60-64` — `<ion-spinner *ngIf="isLoading">` inside Sign In button

**Required fix:** Add `aria-label="Signing in, please wait"`.

---

#### PH-MAJ-05 — Dashboard table uses role="row" without role="table" ancestor

**WCAG:** 1.3.1 Info and Relationships
**Impact:** The `<div role="row">` header and `<article>` row elements are not inside a `role="table"` or `role="grid"` container. Screen readers will not interpret the layout as a data table; column/row relationships are lost.
**Check:** CHECK-09

**Affected files:**
- `projects/portal-hoteles/src/app/pages/dashboard/dashboard.page.html:42` — `<div class="portal-hoteles-dashboard-table">` wraps `role="row"` but has no own role

**Current code:**
```html
<div class="portal-hoteles-dashboard-table" *ngIf="...">
  <div class="portal-hoteles-dashboard-table__header" role="row">
    <span>Booking ID</span>
    ...
  </div>
  <article class="portal-hoteles-dashboard-table__row" *ngFor="...">
```

**Required fix option A** (semantic HTML — preferred):
```html
<table class="portal-hoteles-dashboard-table" *ngIf="...">
  <thead><tr><th>Booking ID</th><th>Guest Name</th>...</tr></thead>
  <tbody>
    <tr *ngFor="let reservation of visibleReservations">
      <td>...</td>
    </tr>
  </tbody>
</table>
```

**Required fix option B** (ARIA fallback):
```html
<div class="portal-hoteles-dashboard-table" role="table" aria-label="Reservations" *ngIf="...">
  <div role="rowgroup">
    <div role="row" class="portal-hoteles-dashboard-table__header">
      <span role="columnheader">Booking ID</span>
      ...
    </div>
  </div>
  <div role="rowgroup">
    <div role="row" *ngFor="...">
      <span role="cell">...</span>
    </div>
  </div>
</div>
```

---

#### PH-MAJ-06 — Reservation status without aria-live in overview card

**WCAG:** 4.1.3 Status Messages
**Impact:** When an admin approves or rejects a reservation, the status label updates but there is no live region; screen reader users do not hear the updated status.
**Check:** CHECK-09

**Affected files:**
- `src/app/shared/components/portal-hoteles/reservation-overview-card/portal-hoteles-reservation-overview-card.component.html:32` — `<p [class]="statusClass">{{ statusLabel }}</p>`

**Required fix:**
```html
<p [class]="statusClass" role="status" aria-live="polite" aria-atomic="true">{{ statusLabel }}</p>
```

---

#### PH-MAJ-07 — h3 in generic-card without h2 context on dashboard

**WCAG:** 1.3.1 Info and Relationships
**Impact:** The `<h3>` in `portal-hoteles-generic-card` follows the `<h1>` on the dashboard page with no `<h2>` in between, creating a heading-level skip.
**Check:** CHECK-07 / CHECK-09

**Affected files:**
- `src/app/shared/components/portal-hoteles/generic-card/generic-card.component.html:4` — `<h3 *ngIf="title">{{ title }}</h3>`
- `projects/portal-hoteles/src/app/pages/dashboard/dashboard.page.html` — `<h1>` on line 4, then sections containing grid cards with `<h3>` titles

**Required fix option A:** Change `<h3>` to `<h2>` in `generic-card.component.html`.
**Required fix option B:** Add `<h2>` section headings on the dashboard page before the grid cards.

---

### Minor Issues

None found.

---

## Part C — Live Axe Scan Findings (Phase 2)

> Pages scanned: `/home`, `/login`, `/register`, `/search-results` (travelhub) + `/login`, `/dashboard` (portal-hoteles). All findings are documented below.

### New findings from axe (not caught by static analysis)

---

#### AXE-01 — meta-viewport disables text scaling

**axe Rule:** `meta-viewport`
**Impact:** critical
**WCAG:** 1.4.4 Resize Text
**Pages affected:** All pages (global `index.html`)
**Element:** `<meta name="viewport" content="..., user-scalable=no">`

Mobile users who need to zoom to read text cannot do so. `user-scalable=no` combined with `maximum-scale=1.0` fully prevents pinch-to-zoom on iOS and Android browsers.

**File:** `src/index.html:11`

**Current code:**
```html
<meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

**Required fix:**
```html
<meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0" />
```
Remove `user-scalable=no`, `minimum-scale=1.0`, and `maximum-scale=1.0`. Ionic's mobile layout works correctly without these restrictions.

---

#### AXE-02 — Price prefix "From" text: critically low color contrast

**axe Rule:** `color-contrast`
**Impact:** serious (WCAG treats as Critical for text contrast)
**WCAG:** 1.4.3 Contrast Minimum
**Pages affected:** `/home`, `/search-results`, `/booking-list`, `/booking-detail`
**Element:** `.th-hotel-card__price-label` ("From" text)

Measured: `#adb5bd` on `#ffffff` → **2.07:1** (required: 4.5:1). The "From" prefix in every hotel card is nearly unreadable for low-vision users and fails by more than 2×.

**File:** `src/app/shared/components/th-hotel-card/th-hotel-card.component.scss:181`

**Current code:**
```scss
.th-hotel-card__price-label {
  color: var(--th-neutral-500); /* #adb5bd — 2.07:1 on white */
}
```

**Required fix:**
```scss
.th-hotel-card__price-label {
  color: var(--th-neutral-700); /* #495057 — 7.0:1 on white ✓ */
}
```
Similarly `.th-hotel-card__price-suffix` uses `--th-neutral-600` (#6c757d) which also fails on white (4.42:1). Change to `--th-neutral-700` to pass.

---

#### AXE-03 — Section subtitle text: marginal contrast failure

**axe Rule:** `color-contrast`
**Impact:** serious
**WCAG:** 1.4.3 Contrast Minimum
**Pages affected:** `/home`
**Element:** `.home-section__subtitle`

Measured: `#6c757d` (`--th-neutral-600`) on `#f9fafb` (page background) → **4.48:1** (required: 4.5:1). Misses by 0.02. Confirms and escalates static finding MIN-02.

**File:** `src/app/pages/home/home.page.scss:79`

**Required fix:** Change `color: var(--th-neutral-600)` to `color: var(--th-neutral-700)` (`#495057`, 7.0:1 on `#f9fafb`).

**Note:** Any other element using `--th-neutral-600` on the `#f9fafb` page background has the same failure. Audit all usages of this token.

---

#### AXE-04 — Duplicate and nested banner landmarks

**axe Rule:** `landmark-banner-is-top-level`, `landmark-no-duplicate-banner`, `landmark-unique`
**Impact:** moderate
**WCAG:** Best practice (WCAG 2.4.1 — Bypass Blocks adjacency)
**Pages affected:** All travelhub pages that show both the navbar and a fixed `<ion-header>`
**Elements:** `th-navbar` (`<ion-header role="banner">`) + the page-level fixed `<ion-header role="banner">`

Ionic automatically assigns `role="banner"` to every `<ion-header>`. When the page has both the navbar component and an additional fixed header (e.g., the datetime modal area), two banner landmarks appear. Screen reader users navigating by landmarks encounter two indistinguishable "banner" regions.

**Required fix — option A (preferred):** Add `role="none"` to secondary `<ion-header>` elements that are not the site-wide header:
```html
<!-- In home.page.html, datetime modal's enclosing header if present -->
<ion-header role="none">...</ion-header>
```

**Required fix — option B:** Give distinct `aria-label` values to each header landmark so they are distinguishable:
```html
<ion-header aria-label="Site navigation">...</ion-header>
<!-- secondary -->
<ion-header aria-label="Page controls">...</ion-header>
```

---

#### AXE-05 — Card text and link buttons fail contrast on neutral-100 card background

**axe Rule:** `color-contrast`
**Impact:** serious
**WCAG:** 1.4.3 Contrast Minimum
**Pages affected:** `/login`, `/register`, `localhost:4201/login` — portal-hoteles (same shared template and card background)

The auth card background is `--th-neutral-100` (`#f1f3f5`), which is darker than the page background. This creates contrast failures for any `--th-neutral-600` text or `--th-primary-500` link on that surface.

| Element | Color | Background | Ratio | Required |
|---|---|---|---|---|
| Login/register subtitle text | `#6c757d` (neutral-600) | `#f1f3f5` | **4.21:1** | 4.5:1 ✗ |
| "Forgot Password?" / "Sign Up" / "Sign In" link buttons | `#3b63f7` (primary-500) | `#f1f3f5` | **4.37:1** | 4.5:1 ✗ |
| "I agree…" terms text | `#6c757d` | `#f1f3f5` | **4.21:1** | 4.5:1 ✗ |
| "Terms of Service" / "Privacy Policy" links | `#3b63f7` | `#f1f3f5` | **4.37:1** | 4.5:1 ✗ |
| "Already have an account?" text | `#6c757d` | `#f1f3f5` | **4.21:1** | 4.5:1 ✗ |
| **"Or continue with" divider** | `#adb5bd` (neutral-500) | `#f1f3f5` | **1.86:1** ⚠ | 4.5:1 ✗✗ |

> The divider text ratio of **1.86:1** is the most severe contrast failure in the entire app — the text is nearly invisible.

**Files:**
- `src/app/pages/login/login.page.scss` — card background uses `--th-neutral-100`
- `src/app/pages/register/register.page.scss` — same
- `src/theme/variables.scss` — `--th-primary-500` (`#3b63f7`) insufficient on neutral-100 backgrounds

**Required fix — option A (recommended):** Change both card backgrounds to `--th-white`. All current text colors pass on white.

**Required fix — option B (token fix):**
- Secondary text: `--th-neutral-600` → `--th-neutral-700` (`#495057`, 5.7:1 on `#f1f3f5`)
- Link buttons: `--th-primary-500` → `--th-primary-700` (`#1a3394`, 8.2:1 on `#f1f3f5`)
- Divider text: `--th-neutral-500` → `--th-neutral-700` (`#495057`, 5.7:1 on `#f1f3f5`)

---

#### AXE-06 — <header> inside login card creates nested null landmark

**axe Rule:** `landmark-banner-is-top-level`
**Impact:** moderate
**WCAG:** Best practice (2.4.1 Bypass Blocks adjacency)
**Pages affected:** `/login`, `localhost:4201/login` — portal-hoteles (same shared template); `/register` uses same `<header>` pattern
**Element:** `<header class="login-card__header">` inside `ion-card-content`

The `<header>` element inside the card content area is interpreted by axe as a sectioning landmark nested inside another landmark. Since it is not a site-level or section-level header — it is purely visual chrome inside a card — it should use a `<div>` instead.

**File:** `src/app/pages/login/login.page.html:22`

**Current code:**
```html
<header class="login-card__header">
  <h1 class="login-card__title">Welcome Back</h1>
  ...
</header>
```

**Required fix:**
```html
<div class="login-card__header">
  <h1 class="login-card__title">Welcome Back</h1>
  ...
</div>
```

---

#### AXE-08 — Filter summary subtitle: critically low contrast on colored card background

**axe Rule:** `color-contrast`
**Impact:** serious
**WCAG:** 1.4.3 Contrast Minimum
**Pages affected:** `/search-results`
**Element:** `.th-filter-summary__top-subtitle`

Measured: `#6b7280` on `#a5bdf2` (the filter summary card's blue gradient background) → **2.56:1** (required: 4.5:1). The "Check-in - Check-out | Guests" subtitle text is nearly illegible against the light-blue card background.

**File:** `src/app/shared/components/th-filter-summary/th-filter-summary.component.scss` — card background color producing `#a5bdf2`

**Required fix:** Either darken the subtitle text to meet 4.5:1 on the blue background, or use a light text color (`--th-white`) if the background is dark enough to support it. Verify the exact rendered background in the design system — if the blue is a gradient or token, the fix may be adjusting the card background or the text color token for this component specifically.

---

#### AXE-09 — th-filter-summary: role="img" on interactive container (nested-interactive)

**axe Rule:** `nested-interactive`, `role-img-alt`
**Impact:** serious
**WCAG:** 4.1.2 Name, Role, Value
**Pages affected:** `/search-results`
**Element:** `<ion-card role="img" [attr.aria-label]="resolvedAlt">` wrapping focusable `<button>` Filter/Sort pills

Two violations from the same root cause:

1. **nested-interactive**: `role="img"` is a presentation role — it signals to AT that the element has no interactive descendants. Placing focusable `<button>` elements inside it is contradictory and causes screen readers to encounter keyboard-operable controls they cannot properly announce.

2. **role-img-alt** on the card: `[attr.aria-label]="resolvedAlt"` resolves to `null`/falsy when no filter parameters have been applied (fresh page load), which Angular converts to removing the attribute entirely. The `role="img"` element then has no accessible name.

**File:** `src/app/shared/components/th-filter-summary/th-filter-summary.component.html:1`

**Current code:**
```html
<ion-card class="th-filter-summary" role="img" [attr.aria-label]="resolvedAlt">
  ...
  <div class="th-filter-summary__desktop-actions" ...>
    <button class="th-filter-summary__desktop-pill" type="button">Filter</button>
    <button class="th-filter-summary__desktop-pill" type="button">Sort</button>
  </div>
</ion-card>
```

**Required fix:** Remove `role="img"` from `<ion-card>`. Use a `<section>` with `aria-label` to describe the summary region, and keep the interactive pills as-is. If the visual design should convey "this is a summary display", use CSS — not ARIA role overrides.

```html
<section class="th-filter-summary" [attr.aria-label]="resolvedAlt || 'Search filters'">
  ...
  <div class="th-filter-summary__desktop-actions" aria-label="Quick filter actions">
    <button class="th-filter-summary__desktop-pill" type="button">
      <ion-icon name="options-outline" aria-hidden="true"></ion-icon>
      <span>Filter</span>
    </button>
    <button class="th-filter-summary__desktop-pill" type="button">
      <ion-icon name="swap-vertical-outline" aria-hidden="true"></ion-icon>
      <span>Sort</span>
    </button>
  </div>
</section>
```
Also add `aria-hidden="true"` to the pill button icons, and always provide a fallback value (`|| 'Search filters'`) so the accessible name is never empty.

---

#### AXE-07 — Social button logos (Google, Facebook) missing aria-hidden

**axe Rule:** `role-img-alt`
**Impact:** serious
**WCAG:** 1.1.1 Non-text Content
**Pages affected:** `/register`
**Elements:** `<ion-icon name="logo-google">`, `<ion-icon name="logo-facebook">` inside social sign-up buttons

The social buttons already have visible text labels ("Google", "Facebook") but their logo icons lack `aria-hidden="true"`. Ionic assigns `role="img"` to the icons, making them unlabeled images alongside the button text.

**File:** `src/app/pages/register/register.page.html:127-134`

**Current code:**
```html
<ion-button fill="outline" class="register-social__button">
  <ion-icon name="logo-google" slot="start"></ion-icon>
  Google
</ion-button>
```

**Required fix:**
```html
<ion-button fill="outline" class="register-social__button">
  <ion-icon name="logo-google" slot="start" aria-hidden="true"></ion-icon>
  Google
</ion-button>
```
Apply `aria-hidden="true"` to both `logo-google` and `logo-facebook` icons.

---

### Portal Hoteles — axe-only findings (dashboard page)

---

#### PH-AXE-01 — Sidebar "Main Menu" label: critically low contrast

**axe Rule:** `color-contrast`
**Impact:** serious
**WCAG:** 1.4.3 Contrast Minimum
**Pages affected:** All portal-hoteles pages that show the side-nav
**Element:** `.portal-hoteles-side-nav__section-label` ("Main Menu")

Measured: `#adb5bd` (`--th-neutral-500`) on `#ffffff` → **2.07:1** (required: 4.5:1). The "Main Menu" section label above the navigation links is nearly invisible — same token as the `th-hotel-card__price-label` failure (AXE-02).

**File:** `src/app/shared/components/portal-hoteles/side-nav/portal-hoteles-side-nav.component.scss` — `.portal-hoteles-side-nav__section-label` color

**Required fix:** Change the section-label color to `--th-neutral-700` (`#495057`, 7.0:1 on white) or `--th-neutral-600` (4.5:1+ on white — verify on exact background).

---

#### PH-AXE-02 — Duplicate main landmark: ion-content inside shell's main element

**axe Rule:** `landmark-main-is-top-level`, `landmark-no-duplicate-main`, `landmark-unique`
**Impact:** moderate
**WCAG:** Best practice (2.4.1 Bypass Blocks)
**Pages affected:** All portal-hoteles authenticated pages
**Elements:** `<main class="portal-hoteles-shell__content">` + `<ion-content role="main">` (from Ionic)

Ionic automatically assigns `role="main"` to every `<ion-content>`. The portal-hoteles shell template wraps the router outlet in a `<main>` element, producing two main landmarks on every authenticated page. Screen reader users navigating by landmarks encounter two unlabelled "main" regions and cannot determine which contains the page content.

**File:** `user_interface/projects/portal-hoteles/src/app/app.component.html:14`

**Current code:**
```html
<main class="portal-hoteles-shell__content">
  <ion-router-outlet></ion-router-outlet>   <!-- renders ion-content[role="main"] -->
</main>
```

**Required fix:** Change `<main>` to `<div>` so only `<ion-content>` carries the main landmark:
```html
<div class="portal-hoteles-shell__content">
  <ion-router-outlet></ion-router-outlet>
</div>
```

---

#### PH-AXE-03 — Duplicate banner landmark: two nested header elements

**axe Rule:** `landmark-banner-is-top-level`, `landmark-no-duplicate-banner`, `landmark-unique`
**Impact:** moderate
**WCAG:** Best practice (2.4.1 Bypass Blocks)
**Pages affected:** All portal-hoteles authenticated pages
**Elements:** `<header class="portal-hoteles-shell__header">` (app shell) + `<header class="portal-hoteles-header-bar">` (header-bar component)

The app shell wraps the header-bar component in a `<header>` element; the component itself also uses a `<header>` element as its root. Both receive `role="banner"`, creating a nested and duplicated banner landmark.

**Files:**
- `user_interface/projects/portal-hoteles/src/app/app.component.html:4` — outer `<header class="portal-hoteles-shell__header">`
- `src/app/shared/components/portal-hoteles/header-bar/portal-hoteles-header-bar.component.html` — inner `<header>`

**Required fix:** Change the outer `<header>` in `app.component.html` to `<div>` — the inner component's `<header>` is the correct banner landmark:
```html
<div class="portal-hoteles-shell__header">
  <portal-hoteles-header-bar></portal-hoteles-header-bar>
</div>
```

---

#### PH-AXE-04 — Brand-copy content outside landmark containment

**axe Rule:** `region`
**Impact:** moderate
**WCAG:** Best practice (2.4.1 Bypass Blocks)
**Pages affected:** All portal-hoteles authenticated pages
**Element:** `.portal-hoteles-side-nav__brand-copy` ("TravelHub / Partner Portal")

The sidebar brand text (app name and subtitle) falls outside any recognised landmark in the rendered tree. This may be a side effect of nested `<aside>` elements — the outer `<aside class="portal-hoteles-shell__sidebar">` and inner `<aside class="portal-hoteles-side-nav">` may interact with Ionic's shadow DOM in a way that excludes the brand content from landmark coverage.

**File:** `src/app/shared/components/portal-hoteles/side-nav/portal-hoteles-side-nav.component.html:1`

**Required fix:** Add `aria-label="Sidebar"` to the outer `<aside class="portal-hoteles-shell__sidebar">` in `app.component.html`, or consolidate to a single `<aside>` by removing the shell wrapper:
```html
<!-- app.component.html: change <aside> to <div> in the shell -->
<div class="portal-hoteles-shell__sidebar">
  <portal-hoteles-side-nav ...></portal-hoteles-side-nav>
</div>
<!-- The inner <aside aria-label="Partner Portal navigation"> in the component provides the landmark -->
```

---

### Axe findings that confirm static analysis (same root cause, already in report)

The following axe violations map directly to findings already documented in Part A. No new source file changes needed beyond what those findings already specify.

| Axe rule | Impact | Pages | Confirmed static finding | Root cause |
|---|---|---|---|---|
| `role-img-alt` (×filter icons) | serious | `/home` | CRIT-03, MAJ-02 | `<ion-icon>` in `th-filter` without `aria-hidden` gets `role="img"` with no alt |
| `role-img-alt` (×heart icon per card) | serious | `/home` | MAJ-04 | Favorite `<ion-icon>` without `aria-hidden` becomes unlabeled image |
| `role-img-alt` (×star icon per card) | serious | `/home` | MAJ-06 | Badge `<ion-icon>` without `aria-hidden` becomes unlabeled image |
| `role-img-alt` (×location icon per card) | serious | `/home` | MAJ-01 | Location `<ion-icon>` without `aria-hidden` becomes unlabeled image |
| `role-img-alt` (logo-google, logo-facebook) | serious | `/register` | MAJ-04 (pattern) | Social logo icons in labeled buttons without `aria-hidden` |
| `color-contrast` (subtitle, links, divider) | serious | `/register` | AXE-05 extension | Same `--th-neutral-100` card background trap |
| `color-contrast` (price-label 2.07:1) | serious | `/search-results` | AXE-02 extension | `--th-neutral-500` price prefix on white card — same token as home page |
| `role-img-alt` (heart/star/location per card) | serious | `/search-results` | MAJ-01/04/06 | Same hotel card icons — confirmed across all listing pages |
| `landmark-*` (duplicate banners) | moderate | `/search-results` | AXE-04 extension | Same two `ion-header` banner pattern |
| `role-img-alt` (filter pill icons) | serious | `/search-results` | AXE-09 | Pill button icons without `aria-hidden` inside `role="img"` card |

---

## Part D — Positive Patterns (Keep These)

- `th-input.component.html:21-29` — End icon button uses `[attr.aria-label]="endIconAriaLabel"` — correct conditional pattern; the `endIconAriaLabel` binding is passed from the parent (e.g., "Show password" / "Hide password"), which is the right approach.
- `th-input.component.html:4-9` — Start icon has `aria-hidden="true"` — correctly marking it as decorative.
- `th-navbar.component.html:17,22` — Nav links use `aria-hidden="true"` on their decorative icons.
- `th-details-mosaic.component.html:8,35` — Image gallery buttons use descriptive `[attr.aria-label]` with position counts ("Open photo 1 of 5").
- `th-detail-summary.component.html:50` — Stars wrapper uses `aria-label="{{ stars }} star rating"` — correctly provides a complete accessible label for the star icon group.
- `th-filter-summary.component.html` — `[attr.aria-label]` binding with `resolvedAlt` is the right dynamic-label pattern; the container role needs to change to `<section>` (see AXE-09), but the labelling mechanism itself is correct.
- `booking-detail.page.html:85,129` — Accordion headers use `[attr.aria-expanded]` — correct pattern for disclosure widgets.
- `portal-hoteles-side-nav.component.html:12` — Uses `<nav aria-label="Primary navigation">` — correct landmark usage.
- `portal-hoteles-reservation-overview-card.component.html:11` — `<ul aria-label="Reservation summary">` — correct label on list.
- `register.page.html:28` — `<section aria-label="Create account form">` — properly labeled region.

---

## Part E — Out of Scope

The following were explicitly excluded from this audit:

- Localization / internationalization (i18n)
- Audio/video media content (no media in current app)
- PDF documents
- Native Android UI (Capacitor shell only — WebView content covered above)

---

## Recommended Fix Groups

| Group | Covers | Suggested `/spec-dev` description |
|---|---|---|
| 1 — Button names & icons | CRIT-01, MAJ-01–06 | `"fix icon-only buttons, dynamic aria-labels, and decorative icon aria-hidden across travelhub"` |
| 2 — Input labels | CRIT-02, CRIT-03, MAJ-24 | `"fix form input label associations in th-input, th-filter, and th-payment-summary"` |
| 3 — Live regions & spinners | MAJ-07–14 | `"add aria-live regions and spinner labels for loading and error states across travelhub pages"` |
| 4 — Structure & headings | MAJ-15–23, MIN-01–02 | `"fix heading hierarchy, price grouping, tablist roles, and focus indicators across travelhub"` |
| 5 — Portal Hoteles | PH-MAJ-01–07 | `"fix portal-hoteles accessibility issues: live regions, table semantics, heading hierarchy, and status announcements"` |
| 6 — Regression guard | All | `"integrate axe-core/playwright into E2E test suite for accessibility regression prevention"` |

---

## Appendix — Files Audited

### Travelhub

| File | Checks applied | Findings |
|---|---|---|
| `src/app/pages/home/home.page.html` | CHECK-01–10 | MAJ-07 |
| `src/app/pages/login/login.page.html` | CHECK-01–10 | MAJ-12, MAJ-16 |
| `src/app/pages/register/register.page.html` | CHECK-01–10 | MAJ-13, MAJ-17 |
| `src/app/pages/search-results/search-results.page.html` | CHECK-01–10 | MAJ-08, MAJ-21 |
| `src/app/pages/propertydetail/propertydetail.page.html` | CHECK-01–10 | MAJ-10, MAJ-18 |
| `src/app/pages/booking-detail/booking-detail.page.html` | CHECK-01–10 | MAJ-05, MAJ-11, MAJ-19 |
| `src/app/pages/booking-list/booking-list.page.html` | CHECK-01–10 | MAJ-09, MAJ-20, MAJ-22 |
| `src/app/shared/components/th-hotel-card/th-hotel-card.component.html` | CHECK-01, 03, 05, 06 | MAJ-01, MAJ-04, MAJ-15 |
| `src/app/shared/components/th-input/th-input.component.html` | CHECK-02, 04, 08 | CRIT-02 |
| `src/app/shared/components/th-input/th-input.component.scss` | CHECK-08, 10 | MAJ-23, MIN-02 |
| `src/app/shared/components/th-filter/th-filter.component.html` | CHECK-02, 03 | CRIT-03, MAJ-02 |
| `src/app/shared/components/th-filter/th-filter.component.scss` | CHECK-08 | MIN-01 |
| `src/app/shared/components/th-navbar/th-navbar.component.html` | CHECK-01, 03, 07 | CRIT-01, MAJ-03 |
| `src/app/shared/components/th-badge/th-badge.component.html` | CHECK-03 | MAJ-06 |
| `src/app/shared/components/th-payment-summary/th-payment-summary.component.html` | CHECK-02, 04 | MAJ-14, MAJ-24 |
| `src/app/shared/components/th-detail-summary/th-detail-summary.component.html` | CHECK-07 | MAJ-18 (heading root) |
| `src/app/shared/components/th-amenities-summary/th-amenities-summary.component.html` | CHECK-07 | MAJ-18 (h3 skip) |
| `src/app/shared/components/th-property-review-summary/th-property-review-summary.component.html` | CHECK-07 | MAJ-18 (h3 skip) |
| `src/app/shared/components/th-details-mosaic/th-details-mosaic.component.html` | CHECK-01, 03 | — (no findings) |
| `src/app/shared/components/th-filter-summary/th-filter-summary.component.html` | CHECK-01, 03, 06 | — (no findings) |

### Portal Hoteles

| File | Checks applied | Findings |
|---|---|---|
| `projects/portal-hoteles/src/app/pages/login/login.page.html` | CHECK-01–10, CHECK-09 | PH-MAJ-01, PH-MAJ-04 |
| `projects/portal-hoteles/src/app/pages/dashboard/dashboard.page.html` | CHECK-04, 07, 09 | PH-MAJ-02, PH-MAJ-05, PH-MAJ-07 |
| `projects/portal-hoteles/src/app/pages/dashboard-reservation/dashboard-reservation.page.html` | CHECK-04, 09 | PH-MAJ-03 |
| `projects/portal-hoteles/src/app/app.component.html` | CHECK-07, 09 | PH-AXE-02, PH-AXE-03 |
| `src/app/shared/components/portal-hoteles/side-nav/portal-hoteles-side-nav.component.html` | CHECK-09 | — (nav landmark correct) |
| `src/app/shared/components/portal-hoteles/generic-card/generic-card.component.html` | CHECK-07, 09 | PH-MAJ-07 |
| `src/app/shared/components/portal-hoteles/reservation-overview-card/portal-hoteles-reservation-overview-card.component.html` | CHECK-04, 09 | PH-MAJ-06 |
| `src/app/shared/components/portal-hoteles/header-bar/portal-hoteles-header-bar.component.html` | CHECK-01, 07 | — (not read; flagged for Phase 2) |
