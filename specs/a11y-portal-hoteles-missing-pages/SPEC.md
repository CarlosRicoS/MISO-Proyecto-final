# Feature: WCAG 2.1 AA Accessibility Fixes — Portal Hoteles Missing Pages

**Status:** Implemented
**Created:** 2026-05-04
**Implemented:** 2026-05-04
**Author:** Angel Henao
**Slug:** `a11y-portal-hoteles-missing-pages`

---

## Summary

Apply WCAG 2.1 Level AA accessibility fixes to the two portal-hoteles pages that were not in the original `specs/a11y-audit/a11y-report.md` audit and therefore were never hardened by `specs/a11y-wcag-aa-fixes/`: the **Pricing Configuration** page (`/pricing`) and the **Reports** page (`/reports`). Fixes cover heading hierarchy, semantic table structure, live regions, accessible names on icon/glyph buttons, form-input label associations, and chart-bar non-text-content semantics. The existing axe-core/Playwright regression guard is extended to scan both pages.

---

## Problem Statement

The portal-hoteles app has five user-facing pages: `login`, `dashboard`, `dashboard-reservation`, `pricing-configuration`, and `reports`. The first three were audited and remediated in `specs/a11y-wcag-aa-fixes/`. The other two — added later — never went through the audit, so they ship with several of the same WCAG 2.1 AA violations the platform already paid to fix elsewhere:

- **Hotel-admin users on assistive tech** cannot orient themselves on `/pricing`: the page has no `<h1>` (the kicker heading is commented out), so the first heading announced is an `<h2>` from a card.
- **Screen reader users** lose row/column relationships on both pricing tables — they use `<div role="row">` rows under a non-tabular wrapper (the same PH-MAJ-05 root cause that was fixed for the dashboard).
- **AT users** cannot identify the `‹` / `›` pagination buttons or the `⋮` row-actions button on `/pricing` — the buttons have no accessible name beyond the unicode glyph.
- **AT users** are not notified when `/pricing` data loads or errors out — its loading/error/empty paragraphs have no `aria-live` regions or `role="alert"`.
- **AT users** are not notified when `/reports` data loads — the template has no loading paragraph at all (only empty + error states are rendered).
- **Screen reader users** on `/reports` encounter focusable, unlabelled bar-chart bars (`<div tabindex="0">` with no role) and a chart wrapper whose `aria-label` can resolve to a falsy value when no parameters are bound, removing its accessible name (same root cause as travelhub AXE-09).
- **All keyboard users** see "PDF" and "Excel" export buttons on `/reports` whose visible text reads as a file format, not as an action — adding an explicit accessible name disambiguates the verb.

Success means zero axe violations on `/pricing` and `/reports` in the portal-hoteles Playwright suite, no regressions on the previously fixed pages, and a heading-by-landmark navigation experience that matches the hardened dashboard.

---

## Acceptance Criteria

### Group 1 — Pricing Configuration page (`/pricing`)

1. [x] `pricing-configuration.page.html` has a single page-level `<h1>Pricing Management</h1>` rendered before any card, either visible or `<h1 class="sr-only">` if the design must remain unchanged. The previously commented-out kicker block is removed.
2. [x] The room-rate listing (currently `<div class="portal-hoteles-pricing-table">` with `<div role="row">` and `<article>` rows) is converted to semantic `<table class="portal-hoteles-pricing-table">` with `<thead>`, `<tbody>`, `<tfoot>` (when needed), `<th scope="col">` headers, and `<td>` cells. Visual styling remains intact.
3. [x] The seasonal-rules listing in the same template is converted to the same semantic `<table>` structure.
4. [x] The pagination "‹" button has `aria-label="Previous page"` and `[disabled]` bound to whether previous navigation is available; the "›" button has `aria-label="Next page"` and the equivalent `[disabled]` binding. The active page-number `<span>` has `aria-current="page"`.
5. [x] Every "⋮" row-actions `<ion-button>` (room-rate row + seasonal-rule row) has `aria-label="Row actions"`.
6. [x] The loading paragraph (`*ngIf="isLoading"`) has `aria-live="polite" aria-atomic="true"`; the error paragraph (`*ngIf="!isLoading && errorMessage"`) has `role="alert"`; the single empty-state paragraph has `aria-live="polite" aria-atomic="true"`. The duplicate empty paragraph (currently lines 101–103 and 107–109 of the template) is removed so only one empty message renders.
7. [x] The "Search by room type..." `<ion-input>` is associated with a label: a `<label class="sr-only">` (or visible label) with a generated `for` matching an `[id]` on the input, OR — if the project pattern is `aria-labelledby` to a sibling `<span>` — the same pattern used by `th-filter` in `specs/a11y-wcag-aa-fixes/`.
8. [x] All decorative `<ion-icon>` elements introduced as part of the table conversion (if any are added during refactor) have `aria-hidden="true"`. Existing `aria-label` values on the three `<ion-select>` filters are preserved.

### Group 2 — Reports page (`/reports`)

9. [x] `reports.page.html` renders a "Loading reports…" paragraph with `aria-live="polite" aria-atomic="true"` while the daily revenue rows are loading. The paragraph is shown when the page is loading and no rows have been received yet. The existing empty (`role="alert"` for error / `aria-live="polite"` for empty) handling inside `noRowsTemplate` is preserved.
10. [x] The "PDF" export `<ion-button>` has `aria-label="Export report as PDF"`; the "Excel" export `<ion-button>` has `aria-label="Download report as Excel"`. Visible text is unchanged.
11. [x] All decorative `<ion-icon>` elements on the page (KPI badge icons inside `.portal-hoteles-reports-kpi__badge`) keep `aria-hidden="true"` (already present); no new icons are introduced without `aria-hidden`.

### Group 3 — Shared revenue-chart-card (used by `/reports`)

12. [x] `revenue-chart-card.component.html` chart-wrapper element has a non-empty accessible name in every render path: change `[attr.aria-label]="ariaDescription"` to `[attr.aria-label]="ariaDescription || 'Revenue overview chart'"` so it never resolves to null.
13. [x] Each focusable bar `<div tabindex="0">` inside `.portal-hoteles-revenue-chart-card__bars` has `role="img"` so screen readers announce the existing `[attr.aria-label]` (e.g., "Jan 2026: $12,500") with the correct semantics rather than as a generic focusable element.

### Group 4 — Regression Guard (axe-core / Playwright)

14. [x] The portal-hoteles Playwright spec from `specs/a11y-wcag-aa-fixes/` (under `e2e/web-portal-hoteles/`) is extended so it logs in once and then runs an axe scan on `/pricing` and `/reports` in addition to the existing `/login` and `/dashboard` scans.
15. [x] The extended axe scan asserts zero violations for the same rule set used for the previously fixed pages: `color-contrast`, `aria-allowed-attr`, `aria-required-attr`, `button-name`, `label`, `image-alt`, `landmark-*`, `region`, `role-img-alt`, `nested-interactive`, `meta-viewport`. The CI E2E job continues to run via the existing `npm run e2e:web` command.

---

## Affected Services

| Service | Language | Changes | Notes |
|---|---|---|---|
| `user_interface` (portal-hoteles app) | Angular 20 / Ionic 8 | Templates + minor SCSS | `projects/portal-hoteles/src/app/pages/pricing-configuration/` + `…/pages/reports/` |
| `user_interface` (shared component) | Angular 20 / Ionic 8 | Template-only edit | `src/app/shared/components/portal-hoteles/revenue-chart-card/` — used only by reports page in portal-hoteles |
| `user_interface` (E2E) | Playwright + `@axe-core/playwright` | Extend existing portal-hoteles spec to cover two more routes | `e2e/web-portal-hoteles/` |

---

## API Contracts

None. All changes are frontend-only (HTML templates, minor SCSS where required to preserve the table layout post-refactor, and Playwright spec extensions).

---

## Data Model Changes

None.

---

## Cross-Service Communication

None changed. The pricing-configuration page continues to call the existing PricingEngine endpoint via `PricingEngineService`; the reports page continues to call `incomings_report` endpoints via the existing reports service. No HTTP, auth, or SSM changes.

---

## Out of Scope

- Backend services (`booking`, `booking_orchestrator`, `pms`, `poc_properties`, `auth`, `notifications`, `PricingEngine`, `PricingOrchestator`, `incomings_report`, `checkin`)
- Travelhub app (`user_interface/src/app/`) — already covered by `specs/a11y-wcag-aa-fixes/`
- Previously-fixed portal-hoteles pages: `login`, `dashboard`, `dashboard-reservation`
- Native Android Espresso tests (WebView content is covered by Playwright)
- Localization / internationalization (i18n)
- Visual redesign — fixes preserve the current visual layout
- Postman collection changes
- Terraform / GitHub Actions workflow file changes (the axe scan extends an existing E2E spec; no new workflow)

---

## Open Questions

| # | Question | Resolution |
|---|---|---|
| 1 | Should the pricing-configuration `<h1>` be visible or `.sr-only`? | The implementation chose **`<h1 class="sr-only">Pricing Management</h1>`** because the existing `<portal-hoteles-grid-card title="Pricing Management">` already renders a visible `<h2>Pricing Management</h2>` — adding a second visible "Pricing Management" `<h1>` immediately above it would duplicate the title within the same card. Per Q1's escape clause, the page-level `<h1>` is visually hidden so AT users get the heading hierarchy and sighted users keep the original layout. The grid-card `<h2>` then provides section context, giving a clean h1→h2 progression. |
| 2 | For the search input (AC-7), use `<label for>` association or `aria-labelledby` to a sibling `<span>`? | **`<label class="sr-only" for="pricing-search-input">Search room types</label>`** paired with `[id]="'pricing-search-input'"` on the `<ion-input>`. Matches the `th-input` pattern referenced in `specs/a11y-wcag-aa-fixes/`. |
| 3 | Should bar-chart bars be `role="img"` or `role="button"`? | **`role="img"`** — bars are non-interactive (no click handler), they only announce their `aria-label` (e.g., `"Jan: $12,000"`) when focused. `role="button"` would imply an action that does not exist. |
| 4 | Should the reports page render the "Loading reports…" paragraph instead of the table during load, or above it? | A separate `<p *ngIf="isLoadingReport" aria-live="polite" aria-atomic="true">Loading reports...</p>` paragraph rendered above the table. The table is gated by `!isLoadingReport && hasRows`. The empty/error branches inside `noRowsTemplate` were updated to also gate on `!isLoadingReport`, so the three states (loading / table / empty-or-error) are mutually exclusive — mirrors the `dashboard.page.html` pattern. |

---

## Implementation Notes

### Divergences from spec

1. **AC-1 — `<h1>` rendered as `.sr-only`.** The spec allowed either visible or `.sr-only` for the `<h1>`. The visible option would have duplicated the grid-card title, so the implementation used `<h1 class="sr-only">Pricing Management</h1>`. This is documented as the resolution to Open Question Q1.

2. **AC-4 — `‹` pagination button has `[disabled]="true"` hard-coded.** The pricing-configuration component does not currently expose pagination state (page 1 is rendered as active in the visible "1 / 2" pager, with no underlying current-page property). Since the previous-page action is unavailable in the current design, the implementation hard-codes `[disabled]="true"` on the `‹` button rather than introducing a placeholder property. If pagination becomes dynamic, replace `[disabled]="true"` with a getter such as `[disabled]="!canGoToPreviousPage"`.

3. **`reports.page.ts` — reused existing `isLoadingReport` flag.** PLAN.md anticipated the page might need an `isLoading` boolean added to the TS class. The component already exposed an `isLoadingReport: boolean` field (initialised to `false`, toggled inside `loadReportData()`'s try/finally). The new loading paragraph and the table guard bind to that existing field; no `.ts` edit was required.

4. **SCSS shim for `<div>` → `<table>` conversion.** Converting the two pricing tables required `display: block; width: 100%; border-collapse: collapse;` on `.portal-hoteles-pricing-table` plus flex stacking on `<thead>`/`<tbody>`/`<tfoot>` and reset rules for `<th>`/`<td>` so the existing `display: grid` + `grid-template-columns` rules on `.portal-hoteles-pricing-table__header` and `.portal-hoteles-pricing-table__row` continue to drive the column layout. Visual parity verified manually; no responsive-breakpoint regressions.

---

## Notes

- Source of truth for prior patterns: `specs/a11y-wcag-aa-fixes/SPEC.md` and `specs/a11y-audit/a11y-report.md`. The same fix idioms (semantic `<table>` for PH-MAJ-05, `aria-live` for loading states, `aria-label` fallback strings, `role="img"` on chart elements) apply here without modification.
- The shared `revenue-chart-card` component is used only by the reports page within portal-hoteles. The travelhub app does not consume it — there is no risk of cross-app regression from the chart-bar `role="img"` addition.
- The `.sr-only` utility class was added to `src/global.scss` (or equivalent) by the previous spec; this feature reuses it without redefining.
- Both pricing tables (room rates + seasonal rules) currently inherit `.portal-hoteles-pricing-table` SCSS rules that target `div`/`article`. The conversion to `<table>`/`<tr>`/`<td>` will require selector adjustments in `pricing-configuration.page.scss` to target the new semantic elements while preserving the visible grid layout (`display: grid` over `<tr>` is the simplest approach; alternatively, a CSS custom-properties-driven layout). Visual parity is a hard requirement.
- The error paragraph at line 104 of the current pricing-configuration template (`*ngIf="!isLoading && errorMessage"`) needs both `role="alert"` and the `errorMessage` content; the duplicate empty paragraph at lines 107–109 must be removed in the same edit so the conditions are mutually exclusive.
