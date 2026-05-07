# Tasks: WCAG 2.1 AA Accessibility Fixes — Portal Hoteles Missing Pages

**Based on:** `specs/a11y-portal-hoteles-missing-pages/PLAN.md`
**Created:** 2026-05-04
**Total tasks:** 5
**Agents involved:** implementation-engineer, test-engineer, review-engineer, devops-engineer, docs-engineer

---

## Phase 4 Execution Plan

```
[1] IMPL-01   → implementation-engineer (single task — frontend-only feature)
[2] TEST-01   → test-engineer            (unit + E2E + axe regression)
[3] RVEW-01   → review-engineer          (verifies all tests + SPEC traceability)
[4] DEVOPS-01 → devops-engineer  ┐ parallel after RVEW-01
    DOCS-01   → docs-engineer    ┘
```

---

## Task List

| ID | Agent | Description | Depends On | Status |
|---|---|---|---|---|
| IMPL-01 | implementation-engineer | Frontend (portal-hoteles): apply WCAG 2.1 AA fixes to `pricing-configuration.page.{html,scss,ts?}`, `reports.page.{html,ts}`, and `revenue-chart-card.component.html` per Groups 1–3 of SPEC.md (AC-1 through AC-13). Verify visual parity in the running portal-hoteles dev server (`npm run start:portal-hoteles`) before handing off. | — | ⬜ pending |
| TEST-01 | test-engineer | Unit tests (Karma/Jest): add specs covering the new template attributes for both pages and the `revenue-chart-card` change — semantic `<table>` rendering, `aria-live` paragraphs, glyph-button `aria-label`s, search-input label association, chart-bar `role="img"` + fallback `aria-label`. Extend `e2e/web-portal-hoteles/a11y.spec.ts` with two new axe scans for `/pricing` and `/reports` per AC-14 and AC-15. Run `npm run test:portal-hoteles` and `npm run e2e:portal-hoteles` and confirm both pass with ≥80% coverage on the modified files. | IMPL-01 | ⬜ pending |
| RVEW-01 | review-engineer | Run `npm run test:portal-hoteles`, `npm run e2e:portal-hoteles`, and `npm run lint`. Verify each AC-1 through AC-15 is satisfied by the diff. Confirm zero axe violations on `/pricing` and `/reports` in the portal-hoteles spec. Confirm no regressions on the previously fixed pages (`/login`, `/dashboard`). Flag any documentation gaps. Return APPROVED or NEEDS FIXES. | TEST-01 | ⬜ pending |
| DEVOPS-01 | devops-engineer | No CI/CD pipeline changes required (the existing `npm run e2e:portal-hoteles` script picks up new tests automatically; no new GitHub Actions workflow). No Terraform changes. No Postman collection changes (frontend-only). Confirm in TASKS.md that nothing under `.github/workflows/`, `terraform/environments/develop/`, or `postman/` needs editing for this feature, and exit. | RVEW-01 | ⬜ pending |
| DOCS-01 | docs-engineer | Update `specs/a11y-portal-hoteles-missing-pages/SPEC.md` (status → Implemented, resolve open questions with actual decisions taken). Add an "Implementation Notes" section documenting any divergences. CLAUDE.md does not need updates (no architectural change). Service READMEs do not need updates (no backend change). Inline JSDoc may be added to `revenue-chart-card.component.ts` only if the public input contract changed (it should not). | RVEW-01 | ⬜ pending |

---

## Acceptance Criteria Traceability

| Criterion | Implemented by | Tested by | Reviewed by |
|---|---|---|---|
| AC-1: pricing-configuration `<h1>Pricing Management</h1>` added; commented kicker removed | IMPL-01 | TEST-01 | RVEW-01 |
| AC-2: room-rate listing converted to semantic `<table>`/`<thead>`/`<tbody>`/`<th scope="col">`/`<td>` | IMPL-01 | TEST-01 | RVEW-01 |
| AC-3: seasonal-rules listing converted to semantic `<table>` with same structure | IMPL-01 | TEST-01 | RVEW-01 |
| AC-4: pagination `‹`/`›` buttons get `aria-label`s, `[disabled]` bindings, active page-number `aria-current="page"` | IMPL-01 | TEST-01 | RVEW-01 |
| AC-5: every "⋮" row-actions button has `aria-label="Row actions"` | IMPL-01 | TEST-01 | RVEW-01 |
| AC-6: pricing loading/error/empty paragraphs use `aria-live` / `role="alert"`; duplicate empty paragraph removed | IMPL-01 | TEST-01 | RVEW-01 |
| AC-7: pricing search input gets `<label class="sr-only" for="…">` association | IMPL-01 | TEST-01 | RVEW-01 |
| AC-8: any new icons added during refactor have `aria-hidden="true"`; existing select `aria-label`s preserved | IMPL-01 | TEST-01 | RVEW-01 |
| AC-9: reports page renders "Loading reports…" paragraph with `aria-live="polite" aria-atomic="true"` | IMPL-01 | TEST-01 | RVEW-01 |
| AC-10: PDF / Excel export buttons get `aria-label="Export report as PDF"` / `"Download report as Excel"` | IMPL-01 | TEST-01 | RVEW-01 |
| AC-11: KPI badge icons keep `aria-hidden="true"`; no new unhidden icons introduced | IMPL-01 | TEST-01 | RVEW-01 |
| AC-12: revenue-chart-card chart-wrapper has non-empty `aria-label` fallback (`'Revenue overview chart'`) | IMPL-01 | TEST-01 | RVEW-01 |
| AC-13: revenue-chart-card bars get `role="img"` | IMPL-01 | TEST-01 | RVEW-01 |
| AC-14: portal-hoteles axe spec extended to cover `/pricing` and `/reports` after login | IMPL-01 | TEST-01 | RVEW-01 |
| AC-15: extended axe scan asserts zero violations on the same rule set used for previously fixed pages | IMPL-01 | TEST-01 | RVEW-01 |

---

## Notes

- This feature is frontend-only. No backend services are affected, so no Python/Java/.NET IMPL or TEST tasks exist.
- `IMPL-01` bundles all template, SCSS, TS, and component edits because they are tightly coupled (the engineer must verify visual parity in a single dev-server session). Splitting them adds coordination overhead with no testability benefit.
- The implementation-engineer **must** start the portal-hoteles dev server (`npm run start:portal-hoteles`) and visually verify the pricing tables render identically before/after the `<div>`→`<table>` conversion, per the risk flag in PLAN.md. Type-checking will not catch a layout regression.
- `TEST-01` deliverables include both component unit tests and Playwright E2E scans. The test-engineer must run `npm run e2e:portal-hoteles:with-app` (which boots the dev server and runs Playwright in one command) before declaring done.
- `RVEW-01` runs all three commands (`test:portal-hoteles`, `e2e:portal-hoteles`, `lint`) and walks each AC against the diff. If review fails, do not proceed to DEVOPS-01 / DOCS-01 — re-run IMPL-01 and/or TEST-01 with the blocking issues listed.
- `DEVOPS-01` is a confirmation-only task; the expected outcome is a one-line "no changes required" response. It exists so the docs-engineer is not blocked waiting for it.
