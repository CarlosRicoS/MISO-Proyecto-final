# Static Analysis Guide — TravelHub Angular/Ionic Templates

This guide provides the exact patterns to search for when running Phase 1 of the a11y audit.
Apply every check to every `.html` and `.scss` file in the audit scope. Each check lists the
grep pattern, the violation, and the severity.

---

## How to use this guide

For each file you read:
1. Apply ALL checks in order
2. Log every match with: file path, line number, check ID, WCAG criterion, severity
3. If a pattern is absent when it SHOULD be present (e.g., no `aria-live` anywhere on a page
   that has loading states), log that as a missing-pattern finding

---

## CHECK-01 — Icon-only buttons without accessible name

**Severity:** Critical (WCAG 4.1.2 — Name, Role, Value)

**Applies to:** Any `<ion-button>` or `<button>` that contains ONLY an `<ion-icon>` and no
visible text.

**What to look for:**
```html
<!-- VIOLATION: icon-only button with no aria-label -->
<ion-button fill="clear">
  <ion-icon name="heart-outline"></ion-icon>
</ion-button>

<!-- VIOLATION: aria-label present but static when action is conditional -->
<ion-button fill="clear" aria-label="Menu">
  <ion-icon [name]="isBookingList ? 'ellipsis-vertical' : 'heart'"></ion-icon>
</ion-button>
```

**Correct pattern:**
```html
<!-- Dynamic aria-label matching the icon's meaning -->
<ion-button fill="clear" [attr.aria-label]="isBookingList ? 'More options' : 'Add to favorites'">
  <ion-icon [name]="isBookingList ? 'ellipsis-vertical' : 'heart'" aria-hidden="true"></ion-icon>
</ion-button>
```

**Known instances in codebase:**
- `th-hotel-card.component.html:6` — Favorite button has static `aria-label="Favorite"` (OK but non-descriptive)
- `th-navbar.component.html:73` — Menu/heart button aria-label="Menu" but icon toggles — label never updates

**Grep patterns:**
```
<ion-button(?![^>]*aria-label)[^>]*>\s*<ion-icon
\[name\]="[^"]*\?"(?![^\n]*\[attr\.aria-label\])
```

---

## CHECK-02 — Inputs not programmatically associated with labels

**Severity:** Critical (WCAG 1.3.1 — Info and Relationships)

**Applies to:** All `<ion-input>` elements, including those inside custom components.

**The problem pattern in this codebase:**
```html
<!-- VIOLATION: <span> or <label> is not linked via for/id -->
<span class="th-filter__label">{{ locationLabel }}</span>
<ion-item>
  <ion-input [placeholder]="locationPlaceholder"></ion-input>
</ion-item>
```

**Also check th-input.component.html specifically:**
The `<label>` element exists but `<ion-input>` has no `id` and `<label>` has no `for` —
programmatic association is absent even though it looks correct visually.

**Correct pattern:**
```html
<label [for]="inputId">{{ label }}</label>
<ion-item>
  <ion-input [id]="inputId" [attr.aria-labelledby]="labelId"></ion-input>
</ion-item>
```

**Grep for inputs without aria associations:**
```
<ion-input(?![^>]*aria-label)(?![^>]*aria-labelledby)(?![^>]*\[id\])
```

**Known instances:**
- `th-filter.component.html:11,29,46,63` — All 4 filter inputs use `<span>` label with no `for`/`id`
- `th-input.component.html:2,10` — `<label>` + `<ion-input>` exist but not linked

---

## CHECK-03 — Decorative icons without aria-hidden

**Severity:** Major (WCAG 1.1.1 — Non-text Content)

**Applies to:** Any `<ion-icon>` used purely for decoration alongside visible text.

**VIOLATION pattern — decorative icon exposed to AT:**
```html
<!-- VIOLATION: location icon reads aloud when city text is already present -->
<p class="th-hotel-card__location">
  <ion-icon name="location-outline"></ion-icon>
  {{ location }}
</p>
```

**Correct pattern:**
```html
<ion-icon name="location-outline" aria-hidden="true"></ion-icon>
```

**Exception — icon carries meaning with no adjacent text:**
```html
<!-- Icon-only button: DO NOT use aria-hidden, fix with CHECK-01 instead -->
<ion-icon name="heart-outline"></ion-icon>
```

**Grep for unguarded decorative icons:**
```
<ion-icon(?![^>]*aria-hidden)(?![^>]*aria-label)
```

Then manually review each match: only flag if the icon is beside visible text (decorative).

**Known instances:**
- `th-hotel-card.component.html:21,39` — location icon with text, no aria-hidden
- `th-filter.component.html:10,29,46,68` — filter icons in slots, no aria-hidden

---

## CHECK-04 — Loading and error states without live regions

**Severity:** Major (WCAG 4.1.3 — Status Messages)

**Applies to:** All pages that show loading spinners, loading text, or async error messages.

**VIOLATION pattern — `*ngIf` status text not announced:**
```html
<!-- VIOLATION: "Loading hotels..." appears on DOM but AT user isn't notified -->
<p class="home-empty" *ngIf="isLoading">Loading hotels...</p>
<p class="home-empty" *ngIf="!isLoading && errorMessage">{{ errorMessage }}</p>
```

**Correct pattern:**
```html
<p class="home-empty" *ngIf="isLoading" aria-live="polite" aria-atomic="true">
  Loading hotels...
</p>
<p class="home-empty" *ngIf="!isLoading && errorMessage" role="alert" aria-live="assertive">
  {{ errorMessage }}
</p>
```

**Also check ion-spinner:**
```html
<!-- VIOLATION: spinner has no accessible label -->
<ion-spinner *ngIf="isLoading" name="crescent"></ion-spinner>

<!-- Correct -->
<ion-spinner *ngIf="isLoading" name="crescent" aria-label="Loading, please wait"></ion-spinner>
```

**Grep patterns:**
```
\*ngIf="isLoading"
\*ngIf=".*errorMessage"
<ion-spinner(?![^>]*aria-label)
```

**Known instances:**
- `home.page.html:83-85` — 3 loading/error `<p>` tags without aria-live
- `propertydetail.page.html:104-105` — loading/error text without aria-live
- `login.page.html:61-64` — `<ion-spinner>` without aria-label

---

## CHECK-05 — Split price text not grouped for screen readers

**Severity:** Major (WCAG 1.3.1 — Info and Relationships)

**Applies to:** Any price display that uses separate spans for prefix/value/suffix.

**VIOLATION pattern:**
```html
<!-- VIOLATION: Screen reader announces "$", "120", "/night" as separate items -->
<span class="th-hotel-card__price-label">{{ pricePrefix }}</span>
<span class="th-hotel-card__price-value">{{ price }}</span>
<span class="th-hotel-card__price-suffix">{{ priceSuffix }}</span>
```

**Correct pattern — wrap in visually hidden accessible text:**
```html
<!-- Visual display unchanged; screen reader gets full price in one announcement -->
<span class="price-wrapper" aria-hidden="true">
  <span class="th-hotel-card__price-label">{{ pricePrefix }}</span>
  <span class="th-hotel-card__price-value">{{ price }}</span>
  <span class="th-hotel-card__price-suffix">{{ priceSuffix }}</span>
</span>
<span class="sr-only">{{ pricePrefix }}{{ price }}{{ priceSuffix }}</span>
```

**Grep pattern:**
```
price-label.*\n.*price-value.*\n.*price-suffix
```

**Known instances:**
- `th-hotel-card.component.html:51-53` (booking variant) and `69-71` (default variant)

---

## CHECK-06 — Incorrect ARIA usage on non-interactive elements

**Severity:** Major (WCAG 4.1.2 — Name, Role, Value)

**Applies to:** aria-label applied to containers, cards, sections, or divs that are not
interactive.

**VIOLATION pattern:**
```html
<!-- VIOLATION: ion-card is not an interactive element; aria-label is meaningless here -->
<ion-card class="login-card" aria-label="Login card">
```

**Correct approach:** Use a descriptive `<h1>` inside the card as the semantic heading instead.
Remove aria-label from the container. The page title conveys the purpose.

**Grep pattern:**
```
<ion-card[^>]*aria-label
<div[^>]*aria-label
<section[^>]*aria-label(?![^>]*role=)
```

**Known instances:**
- `login.page.html:20` — `<ion-card aria-label="Login card">`

---

## CHECK-07 — Heading hierarchy violations

**Severity:** Major (WCAG 1.3.1 — Info and Relationships)

**Applies to:** All page templates. There must be exactly one `<h1>` per page; headings must
not skip levels (h1 → h3 without h2).

**What to audit:**
- List all heading tags found in the template: `<h1>`, `<h2>`, `<h3>`, `<h4>`, `<h5>`, `<h6>`
- Verify: exactly one h1 exists (it may be in the page, not a shared component)
- Verify: no level is skipped (e.g., h1 followed directly by h3)

**Grep pattern:**
```
<h[1-6]
```

**Note on Ionic:** `<ion-card-header>` and `<ion-card-title>` are NOT semantic headings — they
render as `<div>`. Any title inside those components must use an explicit `<h*>` tag.

---

## CHECK-08 — Interactive elements without focus indicators (SCSS)

**Severity:** Major (WCAG 2.4.7 — Focus Visible)

**Applies to:** `.scss` files in components and pages.

**VIOLATION pattern:**
```scss
// VIOLATION: removes focus ring with no replacement
button:focus {
  outline: none;
}

// VIOLATION: globally removes focus
* {
  outline: none;
}
```

**Acceptable pattern (replacement, not removal):**
```scss
// OK: replaces native outline with custom box-shadow
&:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--ion-color-primary);
}
```

**Grep patterns:**
```
outline:\s*none
outline:\s*0
```

For each match, check whether `:focus-visible` or `box-shadow` focus replacement exists nearby.
If `outline:none` exists with NO replacement, flag as Major. With replacement, flag as Minor.

---

## CHECK-09 — Portal Hoteles specific patterns

**Applies to:** `user_interface/projects/portal-hoteles/src/` AND
`user_interface/src/app/shared/components/portal-hoteles/`

**Additional checks for portal-hoteles:**

1. **Side navigation — landmark role:**
   ```html
   <!-- Check that side-nav uses <nav> or role="navigation" -->
   <!-- VIOLATION if only <div> or <ion-menu> without aria-label -->
   ```

2. **Card components — heading level:**
   ```html
   <!-- generic-card.component.html uses <h3> directly -->
   <!-- Verify the page context — is there an h2 above? -->
   ```

3. **Reservation overview card — status announcements:**
   Check that booking status changes (approved/confirmed/rejected) use `role="status"` or
   `aria-live="polite"` when they update dynamically.

**Grep pattern for portal-hoteles:**
```
<ion-menu(?![^>]*aria-label)
role="navigation"
<h[1-6]
```

---

## CHECK-10 — Color contrast (SCSS)

**Severity:** Critical (WCAG 1.4.3 — Contrast Minimum, AA: 4.5:1 for normal text, 3:1 for large)

**What to look for in `.scss` files:**
- Hardcoded low-contrast color pairs (light gray text on white, light text on light backgrounds)
- CSS custom properties that might result in low contrast

**Pattern to grep:**
```
color:\s*#[a-fA-F0-9]{3,6}
background.*color:\s*#[a-fA-F0-9]{3,6}
```

**Known risk areas:**
- Placeholder text (typically `#999` or similar — fails 4.5:1 against white)
- Disabled state text
- Helper text below inputs (`th-input__helper`)
- Badge/tag components

**Note:** Contrast cannot be fully evaluated statically — flag any hardcoded light colors
for live verification in Phase 2.

---

## Summary of check IDs and severity

| Check | Description | Severity |
|---|---|---|
| CHECK-01 | Icon-only buttons without accessible name | Critical |
| CHECK-02 | Inputs not linked to labels | Critical |
| CHECK-10 | Color contrast | Critical |
| CHECK-03 | Decorative icons without aria-hidden | Major |
| CHECK-04 | Loading/error states without aria-live | Major |
| CHECK-05 | Split price text | Major |
| CHECK-06 | Incorrect ARIA on non-interactive elements | Major |
| CHECK-07 | Heading hierarchy | Major |
| CHECK-08 | Missing focus indicators | Major |
| CHECK-09 | Portal Hoteles specifics | Major |
