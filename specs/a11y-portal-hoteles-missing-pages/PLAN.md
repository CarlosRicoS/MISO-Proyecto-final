# Technical Plan: WCAG 2.1 AA Accessibility Fixes — Portal Hoteles Missing Pages

**Based on:** `specs/a11y-portal-hoteles-missing-pages/SPEC.md`
**Created:** 2026-05-04

---

## Architecture Decisions

1. **Reuse the patterns established by `specs/a11y-wcag-aa-fixes/`** — semantic `<table>` over ARIA-role fallback (PH-MAJ-05 Option A), `aria-live="polite" aria-atomic="true"` on loading/empty paragraphs, `role="alert"` on error paragraphs, `[attr.aria-label]` with a non-empty fallback string for chart wrappers, and the existing `.sr-only` utility class in `src/global.scss:140`. No new utility classes, no new components.

2. **Convert pricing tables to semantic `<table>` while keeping CSS Grid layout** — the current `.portal-hoteles-pricing-table__header,row` selectors apply `display: grid` with a fixed `grid-template-columns`. Since `display: grid` works on `<thead>`/`<tbody>`/`<tr>`/`<td>` when the parent table has `display: table` overridden to `display: block`, the conversion is template-only plus a small SCSS shim: set `.portal-hoteles-pricing-table { display: block; }` on the new `<table>` and keep the grid layout on the now-`<tr>` selector. No layout regression. (The reports page already uses semantic `<table>` with the same approach — verified at `reports.page.html:85-136`.)

3. **Pagination "‹"/"›" buttons keep their glyph as visible content** — adding `aria-label` is enough; we do not replace the visible text, because the existing reports pagination uses `Previous`/`Next` words and that's the right pattern there too. Visual parity is the hard constraint, so glyph + accessible label is the minimum-risk path.

4. **Bar-chart bars get `role="img"`, not `role="button"`** — the bars expose only data (a value at a category), no action. `role="img"` makes the existing `[attr.aria-label]` the accessible name and keeps `tabindex="0"` meaningful for keyboard users who want to inspect each value.

5. **Reports loading paragraph mirrors dashboard pattern** — the `dashboard.page.html` template renders three mutually exclusive paragraphs gated by `isLoadingReservations` / `errorMessage` / empty-list. We will introduce the same `*ngIf="isLoading"` paragraph at the same nesting level as `noRowsTemplate` consumes (i.e., outside the `<table>`), so AT users hear "Loading reports…" once, then either a row count or the error/empty message.

6. **No TS class changes for live-region semantics** — all template attributes are static or bound to existing `isLoading` / `errorMessage` / `hasRows` properties already exposed by `pricing-configuration.page.ts` (lines 42-43) and `reports.page.ts`. The only TS edit may be in `reports.page.ts` if an `isLoading` flag does not already exist; verified during implementation.

7. **The shared `revenue-chart-card` edit is template-only** — adding a string fallback to `[attr.aria-label]` and `role="img"` to the bar `<div>` does not change inputs, signatures, or rendering logic. Existing unit tests should continue to pass; new ones cover the new attributes.

8. **Regression guard extends the existing `e2e/web-portal-hoteles/a11y.spec.ts`** — we add two new `test()` blocks ("pricing page has no axe violations" and "reports page has no axe violations") that reuse the existing `injectAuthSession` and `mockBookingApi` helpers and the AxeBuilder default ruleset. No changes to `playwright-portal-hoteles.config.ts`, no new spec file, no CI workflow edits.

---

## Service Breakdown

### `user_interface` — portal-hoteles app (Angular 20 / Ionic 8)

**Pattern:** Lazy-loaded standalone page components consumed by `app-routing.module.ts`. Templates own all visual rendering; SCSS is page-scoped (`@Component { styleUrls }`).

**Files to modify:**

```
user_interface/projects/portal-hoteles/src/app/pages/pricing-configuration/pricing-configuration.page.html
  — Add <h1>Pricing Management</h1> at top of <ion-content> (delete commented-out kicker block at lines 2-5)
  — Convert .portal-hoteles-pricing-table div/article tree to <table>/<thead>/<tbody>/<tfoot>/<tr>/<th scope="col">/<td>
    (lines 65-99 — room rates) and (lines 161-183 — seasonal rules)
  — Add <label class="sr-only" for="pricing-search-input">Search room types</label> + [id]="'pricing-search-input'"
    on the search <ion-input> (line 58)
  — Add aria-label="Previous page" / "Next page" to glyph pagination buttons (lines 93, 96)
  — Add aria-current="page" to the active page-number <span> (line 94)
  — Add aria-label="Row actions" to every "⋮" <ion-button> (lines 87, 181)
  — Add aria-live="polite" aria-atomic="true" to loading <p> (line 61)
  — Add role="alert" to error <p> (line 104)
  — Reduce duplicate empty <p> at lines 101-103 and 107-109 to a single empty paragraph with
    aria-live="polite" aria-atomic="true"

user_interface/projects/portal-hoteles/src/app/pages/pricing-configuration/pricing-configuration.page.scss
  — Add `.portal-hoteles-pricing-table { display: block; border-collapse: collapse; width: 100%; }`
    so the new <table> element does not collapse into table-layout
  — Move existing grid rules from `.portal-hoteles-pricing-table__header,.portal-hoteles-pricing-table__row`
    selectors to `tr.portal-hoteles-pricing-table__header,tr.portal-hoteles-pricing-table__row`
    (or just `.portal-hoteles-pricing-table tr` with the same grid-template-columns)
  — Verify the responsive @media block (line 394) still applies; if selectors change, update there too
  — `.portal-hoteles-pricing-table__page--active[aria-current="page"]` styling remains via the existing class;
    no new rule needed

user_interface/projects/portal-hoteles/src/app/pages/reports/reports.page.html
  — Insert <p class="portal-hoteles-reports-table__message" *ngIf="isLoading"
       aria-live="polite" aria-atomic="true">Loading reports...</p>
    above the <table *ngIf="hasRows; else noRowsTemplate"> (line 85),
    and gate the table with hasRows && !isLoading
  — Update noRowsTemplate so the empty branch only fires when not loading
  — Add aria-label="Export report as PDF" to the PDF <ion-button> (line 67-73)
  — Add aria-label="Download report as Excel" to the Excel <ion-button> (line 74-81)

user_interface/projects/portal-hoteles/src/app/pages/reports/reports.page.ts
  — Confirm `isLoading: boolean` property exists; add it (default false) and set true/false in the existing
    load method if missing. Tests in test-engineer phase verify the flag is toggled correctly.

user_interface/src/app/shared/components/portal-hoteles/revenue-chart-card/revenue-chart-card.component.html
  — Change [attr.aria-label]="ariaDescription" to [attr.aria-label]="ariaDescription || 'Revenue overview chart'"
    (line 18)
  — Add role="img" to the bar <div tabindex="0"> at line 25-30
```

**Files NOT to create:** no new components, no new services, no new pages, no new modules.

**No DB migration. No new dependencies.** `axe-core` and `@axe-core/playwright` are already installed (verified via the existing `e2e/web-portal-hoteles/a11y.spec.ts:2`).

---

### `user_interface` — Playwright E2E tests

**Pattern:** Test specs under `e2e/web-portal-hoteles/` use the existing `playwright-portal-hoteles.config.ts` config. The a11y spec uses `AxeBuilder` from `@axe-core/playwright` with default rules.

**Files to modify:**

```
user_interface/e2e/web-portal-hoteles/a11y.spec.ts
  — Add a `test('pricing page has no axe violations (authenticated)', …)` block that:
    1. Calls injectAuthSession(page) (existing helper)
    2. Mocks the PricingEngine call: page.route('**/pricing-engine/api/Property*', fulfill 200 + payload)
    3. Goes to /pricing
    4. Waits for either '.portal-hoteles-pricing-table' or the empty/error <p> to render
    5. Runs AxeBuilder({ page }).analyze() and asserts violations.length === 0
  — Add a `test('reports page has no axe violations (authenticated)', …)` block that:
    1. Calls injectAuthSession(page)
    2. Mocks the incomings_report endpoints used by the reports page
       (page.route('**/reports/api/reports/**', …))
    3. Goes to /reports
    4. Waits for either '.portal-hoteles-reports-table' or the empty/error <p> to render
    5. Runs AxeBuilder({ page }).analyze() and asserts violations.length === 0
```

**Files NOT to modify:** `playwright-portal-hoteles.config.ts`, `package.json` (the existing `npm run e2e:portal-hoteles` script picks up the new tests automatically), `.github/workflows/*` (CI invokes the npm script unchanged).

---

## Interface Contracts

### Service-to-service calls

None. No backend changes.

### New domain events (SQS / notifications)

None.

---

## Cross-Service Dependency Diagram

Not applicable — feature is frontend-only.

---

## Risk Flags

- **Pricing-table CSS layout regression after `<div>` → `<table>` conversion** — `<table>` defaults to `display: table` which ignores the `display: grid` declaration. Mitigation: explicitly set `.portal-hoteles-pricing-table { display: block; }` on the table element and keep `display: grid` on the `<tr>` selectors. Visual parity must be verified by the implementation engineer in the running dev server (`npm run start:portal-hoteles`) before tests run — type-checking will not catch a layout regression.

- **`pricing-configuration.page.ts` `Input()` properties drive the table content** — the page accepts `propertyId`, `guests`, `dateInit`, `dateFinish`, `currencyFilter` as inputs (lines 22-26), but the routing module sets none of them. The table renders mock data. The conversion to `<table>` must not change which fields are rendered or the template's binding expressions (`{{ row.roomType }}`, `{{ row.capacityLabel }}`, etc.) — only the wrapping element types change.

- **Reports `isLoading` flag may not exist** — if `reports.page.ts` does not currently expose an `isLoading` boolean, the implementation engineer must add it and toggle it in the existing data-load method. Test-engineer must cover both states. Verified during implementation, not at plan time.

- **Axe scan on `/pricing` may surface contrast issues we did not enumerate in SPEC** — the page uses several `--th-neutral-600` colours that may fail AA on the white card background (the same pattern that produced AXE-03 / AXE-05 in the original audit). If the axe scan flags additional `color-contrast` violations during implementation, fix them inline using the same `--th-neutral-700` substitution from `specs/a11y-wcag-aa-fixes/`. If new finding categories appear (e.g., `nested-interactive`), pause and escalate.

- **Reports bar-chart `role="img"` interaction with focus** — adding `role="img"` to a focusable element does not violate `nested-interactive` because the parent chart wrapper currently uses `role="img"` and the bars are leaf elements without other interactive content. Verified by the existing audit pattern; double-checked by the test-engineer's a11y scan.

- **The duplicate empty paragraph in pricing-configuration.page.html (lines 101-103 vs 107-109)** — both are gated by `*ngIf="!isLoading && !errorMessage && roomRateRows.length === 0"`, so they render together today. The fix removes the second one and keeps the second message text ("No pricing data available for this property.") as the canonical copy because it is more informative for users.

---

## Implementation Order

Recommended sequence to minimise blocking and maximise parallel verification:

1. **Pricing Configuration page template + SCSS** — landing the template restructure first lets the test-engineer write semantic-table assertions while subsequent edits proceed.
2. **Reports page template + (if needed) `isLoading` flag in `.ts`** — independent from pricing.
3. **Shared `revenue-chart-card` template edit** — small, low-risk, lands last so chart-only test cases can target it.
4. **Playwright a11y spec extensions** — added once both pages render the new structure so axe scans pass on first run.

All four steps land in a single `IMPL-01` task because they are tightly coupled (the same engineer can verify visual parity and accessibility tree shape in one dev-server session). Tests follow in `TEST-01`.

