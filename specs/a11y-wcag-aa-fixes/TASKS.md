# Tasks: WCAG 2.1 AA Accessibility Fixes — TravelHub & Portal Hoteles

**Based on:** `specs/a11y-wcag-aa-fixes/PLAN.md`  
**Created:** 2026-04-24  
**Total tasks:** 10  
**Agents involved:** implementation-engineer, test-engineer, review-engineer, devops-engineer, docs-engineer

---

## Phase 4 Execution Plan

```
[1] IMPL-01  implementation-engineer   Groups 1 & 2 — icons + input labels
[1] IMPL-02  implementation-engineer   Group 3 — live regions & spinner labels
[1] IMPL-03  implementation-engineer   Group 4 — structure, headings, contrast, viewport
[1] IMPL-04  implementation-engineer   Group 5 — portal-hoteles all fixes
[2] TEST-01  test-engineer             Unit/component tests for IMPL-01 & IMPL-02
[2] TEST-02  test-engineer             Unit/component tests for IMPL-03 & IMPL-04
[2] TEST-03  test-engineer             axe-core/Playwright regression specs (both apps)
[3] RVEW-01  review-engineer           Verify tests + review vs SPEC.md AC-1 through AC-42
[4] DEVOPS-01 devops-engineer          Confirm E2E npm scripts; no CI/CD pipeline changes
[4] DOCS-01  docs-engineer             Sync SPEC.md, CLAUDE.md, a11y-report.md status
```

---

## Task List

| ID | Agent | Description | Depends On | Status |
|---|---|---|---|---|
| IMPL-01 | implementation-engineer | **Groups 1 & 2 — Button names, decorative icons, and input label associations.** Add `aria-hidden="true"` to all decorative `<ion-icon>` elements in: `th-navbar` (notifications ×2, toggled mobile-action icon), `th-hotel-card` (location ×2, heart), `th-filter` (location, calendar ×2, people, search), `th-badge` (star), `booking-detail` accordion (close-circle, chevron-down ×2, calendar), `register.page.html` (logo-google, logo-facebook). Bind dynamic `[attr.aria-label]` on the th-navbar mobile action button. Add module-level ID counter to `th-input.component.ts`; wire `[for]`/`[id]`/`[attr.aria-labelledby]` in `th-input.component.html`. Add static IDs and `aria-labelledby` to Location and Guests fields in `th-filter.component.html` and Guests field in `th-payment-summary.component.html`. | — | ⬜ pending |
| IMPL-02 | implementation-engineer | **Group 3 — Live regions and spinner labels.** Add `aria-live="polite" aria-atomic="true"` to loading and empty-state paragraphs, and `role="alert" aria-live="assertive"` to error paragraphs in: `home.page.html`, `search-results.page.html`, `booking-list.page.html`, `propertydetail.page.html`, `booking-detail.page.html`. Add `aria-label="Signing in, please wait"` to the spinner in `login.page.html` and `aria-label="Creating account, please wait"` to the spinner in `register.page.html`. Add `aria-label="Loading, please wait"` to all `<ion-spinner>` elements in `th-payment-summary.component.html`. | — | ⬜ pending |
| IMPL-03 | implementation-engineer | **Group 4 — Structure, headings, contrast, and viewport.** (a) Remove `user-scalable=no`, `minimum-scale`, `maximum-scale` from `src/index.html`. (b) Add `.sr-only` utility class to `src/global.scss`. (c) Wrap price spans in `th-hotel-card.component.html` with `aria-hidden="true"` container + adjacent `<span class="sr-only">` for both price variants. (d) Fix contrast tokens: `th-hotel-card.component.scss` (`--th-neutral-500/600` → `--th-neutral-700`), `home.page.scss` subtitle. (e) Remove `aria-label` from `<ion-card>` and change `<header>` → `<div>` in `login.page.html` and `register.page.html`; fix card background contrast in both SCSS files. (f) Change `<h3>` → `<h2>` in `th-amenities-summary.component.html` and `th-property-review-summary.component.html`. (g) Add `<h1 class="sr-only">` to `booking-list.page.html` and `search-results.page.html`. (h) Add `role="tab"` and `tabindex` management to booking-list filter buttons; add `role="tabpanel"` to content panel. (i) Add `:focus-visible` ring to `.th-input__icon-button` in `th-input.component.scss`. (j) Replace `<ion-card role="img">` with `<section>` in `th-filter-summary.component.html`; add `aria-hidden="true"` to pill icons; fix subtitle contrast in SCSS. (k) Add `role="none"` to any secondary `<ion-header>` elements found in page templates. | — | ⬜ pending |
| IMPL-04 | implementation-engineer | **Group 5 — Portal-hoteles all fixes.** (a) `projects/portal-hoteles/src/app/app.component.html`: change outer `<header>` → `<div>`, outer `<aside>` → `<div>`, `<main>` → `<div>`. (b) `projects/portal-hoteles/src/app/pages/login/login.page.html`: remove `aria-label` from `<ion-card>`, change `<header>` → `<div>`, add `aria-label` to spinner. (c) `projects/portal-hoteles/src/app/pages/login/login.page.scss`: fix card background contrast. (d) `projects/portal-hoteles/src/app/pages/dashboard/dashboard.page.html`: add `aria-live` / `role="alert"` to `#reservationsFallback` paragraphs; convert table area to semantic `<table>/<thead>/<tbody>/<th scope="col">/<td>/<tfoot>`. (e) `projects/portal-hoteles/src/app/pages/dashboard-reservation/dashboard-reservation.page.html`: add `aria-live="polite"` and `role="alert"` to loading/error paragraphs. (f) `src/app/shared/components/portal-hoteles/generic-card/generic-card.component.html`: `<h3>` → `<h2>`. (g) `src/app/shared/components/portal-hoteles/reservation-overview-card/portal-hoteles-reservation-overview-card.component.html`: add `role="status" aria-live="polite" aria-atomic="true"` to status paragraph. (h) `src/app/shared/components/portal-hoteles/side-nav/portal-hoteles-side-nav.component.scss`: change section-label color from `--th-neutral-500` → `--th-neutral-700`. | — | ⬜ pending |
| TEST-01 | test-engineer | **Unit/component tests for IMPL-01 & IMPL-02.** Write Angular component/DOM tests (Karma/Jasmine or Jest) covering: `th-input` — label `for` attribute matches input `id`; `aria-labelledby` is set when label is present. `th-filter` — Location and Guests ion-inputs have correct `aria-labelledby`. `th-navbar` — mobile action button `aria-label` is `"More options"` when `isBookingList=true` and `"Add to favorites"` when false; icon has `aria-hidden`. `th-badge` — icon has `aria-hidden`. `th-payment-summary` — all `<ion-spinner>` elements have `aria-label`. `home.page` — loading paragraph has `aria-live="polite"`; error paragraph has `role="alert"`. Coverage target: ≥80% on modified component classes. | IMPL-01, IMPL-02 | ⬜ pending |
| TEST-02 | test-engineer | **Unit/component tests for IMPL-03 & IMPL-04.** Write tests covering: `th-hotel-card` — price wrapper has `aria-hidden="true"`; sr-only span contains concatenated price string. `th-amenities-summary` — root heading is `<h2>`. `th-property-review-summary` — root heading is `<h2>`. `booking-list.page` — `<h1>` is present; filter buttons have `role="tab"` and managed `tabindex`. `th-filter-summary` — root element is `<section>` (not `ion-card`); `aria-label` defaults to `"Search filters"` when no filter params. `portal-hoteles generic-card` — heading is `<h2>`. `portal-hoteles reservation-overview-card` — status paragraph has `role="status"` and `aria-live`. Coverage target: ≥80% on modified component classes. | IMPL-03, IMPL-04 | ⬜ pending |
| TEST-03 | test-engineer | **axe-core/Playwright regression specs.** Create `user_interface/e2e/web/a11y.spec.ts` using `AxeBuilder` from `@axe-core/playwright` (already installed). Scan `/home`, `/login`, `/register`, `/search-results` via WireMock mocks (follow pattern from `hotel-flows.spec.ts`). Assert `violations` array is empty; on failure, print violation summaries. Create `user_interface/e2e/web-portal-hoteles/a11y.spec.ts` scanning `/login` and `/dashboard` (follow auth pattern from `portal-auth-flow.spec.ts`). Both specs must pass with zero axe violations for the rules fixed in this feature. | IMPL-01, IMPL-02, IMPL-03, IMPL-04 | ⬜ pending |
| RVEW-01 | review-engineer | **Verify all test suites pass and implementation matches SPEC.md.** Run `npx playwright test e2e/web` and `npx playwright test --config=playwright-portal-hoteles.config.ts`. Verify all 42 acceptance criteria in `specs/a11y-wcag-aa-fixes/SPEC.md` are met. Check for missing `aria-hidden`, unresolved contrast tokens, any `<h3>` that should be `<h2>`, spinners without `aria-label`, and missing `aria-live` regions. Flag any documentation gaps. Return **APPROVED** or **NEEDS FIXES**. | TEST-01, TEST-02, TEST-03 | ⬜ pending |
| DEVOPS-01 | devops-engineer | **Confirm E2E npm scripts cover new spec files.** Verify `npm run e2e:web` (testDir `./e2e/web`) and `npm run e2e:portal-hoteles` (config `playwright-portal-hoteles.config.ts`) automatically include the new `a11y.spec.ts` files — no script changes should be needed since they glob by directory. No CI/CD pipeline changes required (no new service, no new Docker image, no new Terraform stack). No Postman collection changes (frontend-only fix). Document confirmation in a short comment. | RVEW-01 | ⬜ pending |
| DOCS-01 | docs-engineer | **Sync documentation.** (1) Update `specs/a11y-wcag-aa-fixes/SPEC.md`: set status to `Implemented`, resolve open questions section. (2) Update `specs/a11y-report.md`: mark all 46 findings as resolved (add `**Status: Fixed**` to each finding). (3) Check `CLAUDE.md` — no architecture changes; no update needed. (4) Add a note to `user_interface/README.md` (if exists) about the axe-core E2E regression suite and `npm run e2e:web`/`npm run e2e:portal-hoteles` for accessibility testing. | RVEW-01 | ⬜ pending |

---

## Acceptance Criteria Traceability

| Criterion | Implemented by | Tested by | Reviewed by |
|---|---|---|---|
| AC-1: th-navbar mobile button dynamic aria-label | IMPL-01 | TEST-01 | RVEW-01 |
| AC-2: th-hotel-card decorative icons aria-hidden | IMPL-01 | TEST-01 | RVEW-01 |
| AC-3: th-filter icons aria-hidden | IMPL-01 | TEST-01 | RVEW-01 |
| AC-4: th-navbar notifications icons aria-hidden | IMPL-01 | TEST-01 | RVEW-01 |
| AC-5: th-badge star icon aria-hidden | IMPL-01 | TEST-01 | RVEW-01 |
| AC-6: booking-detail accordion icons aria-hidden | IMPL-01 | TEST-01 | RVEW-01 |
| AC-7: register social logo icons aria-hidden | IMPL-01 | TEST-01 | RVEW-01 |
| AC-8: th-input label programmatically associated | IMPL-01 | TEST-01 | RVEW-01 |
| AC-9: th-filter Location & Guests aria-labelledby | IMPL-01 | TEST-01 | RVEW-01 |
| AC-10: th-payment-summary Guests aria-labelledby | IMPL-01 | TEST-01 | RVEW-01 |
| AC-11: home.page.html live regions | IMPL-02 | TEST-01 | RVEW-01 |
| AC-12: search-results, booking-list, propertydetail, booking-detail live regions | IMPL-02 | TEST-01 | RVEW-01 |
| AC-13: login spinner aria-label | IMPL-02 | TEST-01 | RVEW-01 |
| AC-14: register spinner aria-label | IMPL-02 | TEST-01 | RVEW-01 |
| AC-15: th-payment-summary spinner aria-labels | IMPL-02 | TEST-01 | RVEW-01 |
| AC-16: viewport meta without user-scalable=no | IMPL-03 | TEST-03 (axe) | RVEW-01 |
| AC-17: th-hotel-card price grouped with sr-only | IMPL-03 | TEST-02 | RVEW-01 |
| AC-18: th-hotel-card price-label/suffix contrast | IMPL-03 | TEST-03 (axe) | RVEW-01 |
| AC-19: home subtitle contrast | IMPL-03 | TEST-03 (axe) | RVEW-01 |
| AC-20: login/register card background white | IMPL-03 | TEST-03 (axe) | RVEW-01 |
| AC-21: th-filter-summary subtitle contrast | IMPL-03 | TEST-03 (axe) | RVEW-01 |
| AC-22: login ion-card no aria-label; header→div | IMPL-03 | TEST-02 | RVEW-01 |
| AC-23: register ion-card no aria-label; header→div | IMPL-03 | TEST-02 | RVEW-01 |
| AC-24: h2 in th-amenities-summary and th-property-review-summary | IMPL-03 | TEST-02 | RVEW-01 |
| AC-25: booking-list sr-only h1 | IMPL-03 | TEST-02 | RVEW-01 |
| AC-26: search-results sr-only h1 | IMPL-03 | TEST-02 | RVEW-01 |
| AC-27: booking-list tablist role/tabindex/tabpanel | IMPL-03 | TEST-02 | RVEW-01 |
| AC-28: th-input icon-button focus-visible ring | IMPL-03 | TEST-02 | RVEW-01 |
| AC-29: secondary ion-header role="none" | IMPL-03 | TEST-03 (axe) | RVEW-01 |
| AC-30: th-filter-summary section + pill icons aria-hidden | IMPL-03 | TEST-02 | RVEW-01 |
| AC-31: portal-hoteles login ion-card no aria-label; header→div | IMPL-04 | TEST-02 | RVEW-01 |
| AC-32: portal-hoteles login spinner aria-label | IMPL-04 | TEST-02 | RVEW-01 |
| AC-33: dashboard loading/error aria-live | IMPL-04 | TEST-02 | RVEW-01 |
| AC-34: dashboard-reservation loading/error aria-live | IMPL-04 | TEST-02 | RVEW-01 |
| AC-35: dashboard semantic table | IMPL-04 | TEST-02 | RVEW-01 |
| AC-36: reservation-overview-card status role="status" | IMPL-04 | TEST-02 | RVEW-01 |
| AC-37: generic-card h2 | IMPL-04 | TEST-02 | RVEW-01 |
| AC-38: side-nav section-label contrast | IMPL-04 | TEST-03 (axe) | RVEW-01 |
| AC-39: app.component landmark restructure | IMPL-04 | TEST-03 (axe) | RVEW-01 |
| AC-40: @axe-core/playwright installed | — (already present) | TEST-03 | RVEW-01 |
| AC-41: travelhub axe spec passes on 4 pages | TEST-03 | TEST-03 | RVEW-01 |
| AC-42: portal-hoteles axe spec passes on 2 pages | TEST-03 | TEST-03 | RVEW-01 |

---

## Notes

- IMPL-01 through IMPL-04 are independent of each other (no shared file edits in conflicting areas) but are executed sequentially by one implementation-engineer agent.
- `.sr-only` must be added to `src/global.scss` (in IMPL-03) before TEST-02 runs the sr-only price-grouping test.
- `@axe-core/playwright` (`^4.11.2`) is already in `user_interface/package.json` devDependencies — no install step needed for TEST-03.
- DEVOPS-01 scope is confirmation-only: the existing `npm run e2e:web` and `npm run e2e:portal-hoteles` scripts glob `./e2e/web/` and the portal-hoteles testDir automatically, so new spec files are picked up without script changes.
- The review-engineer should run E2E tests against the dev server with WireMock stubs (see `npm run e2e:web:with-wiremock`).
