# Report Template — a11y-report.md

Use this exact structure when writing `specs/a11y-audit/a11y-report.md`.
Replace all `<placeholders>` with real content. Do not leave empty sections.

---

```markdown
# Accessibility Audit Report — TravelHub

**Date:** <YYYY-MM-DD>
**Auditor:** Claude Code (a11y-audit skill)
**Standard:** WCAG 2.1 Level AA
**Scope:** travelhub (Angular/Ionic app) + portal-hoteles (Angular app)
**Phases completed:** <Static analysis only / Static + Live axe scan>

---

## Executive Summary

> 2–3 sentences describing the overall state of accessibility and the most critical areas.

| Severity | Travelhub | Portal Hoteles | Total |
|---|---|---|---|
| Critical | N | N | N |
| Major | N | N | N |
| Minor | N | N | N |
| **Total** | **N** | **N** | **N** |

---

## Part A — Travelhub Findings

### Critical Issues

---

#### CRIT-01 — <short title>

**WCAG:** <criterion, e.g., 4.1.2 Name, Role, Value>
**Impact:** Screen reader users cannot <describe the failure>
**Check:** CHECK-0N

**Affected files:**
- `<file path>:<line>` — <description of instance>
- `<file path>:<line>` — <description of instance>

**Current code:**
```html
<!-- Paste the problematic snippet -->
```

**Required fix:**
```html
<!-- Paste the corrected snippet -->
```

---

#### CRIT-02 — <short title>

[...same structure...]

---

### Major Issues

---

#### MAJ-01 — <short title>

**WCAG:** <criterion>
**Impact:** <describe impact on AT users>
**Check:** CHECK-0N

**Affected files:**
- `<file path>:<line>` — <description>

**Current code:**
```html
```

**Required fix:**
```html
```

---

[Continue for MAJ-02, MAJ-03, ...]

---

### Minor Issues

---

#### MIN-01 — <short title>

**WCAG:** <criterion>
**Impact:** <describe impact — minor issues are real but lower priority>
**Check:** CHECK-0N

**Affected files:**
- `<file path>:<line>`

**Note:** <Any additional context or acceptable workaround>

---

[Continue for MIN-02, ...]

---

## Part B — Portal Hoteles Findings

### Critical Issues

#### PH-CRIT-01 — <short title>

[...same structure as Part A critical issues...]

---

### Major Issues

#### PH-MAJ-01 — <short title>

[...same structure...]

---

### Minor Issues

#### PH-MIN-01 — <short title>

[...same structure...]

---

## Part C — Live Axe Scan Findings (Phase 2)

> Skip this section if Phase 2 was not run.

### New findings from axe (not caught by static analysis)

#### AXE-01 — <rule-id, e.g., color-contrast>

**axe Rule:** `<rule-id>`
**Impact:** <critical | serious | moderate | minor>
**WCAG:** <criterion>
**Pages affected:** <list of pages>
**Element:** `<CSS selector or description>`

---

## Part D — Positive Patterns (Keep These)

> Document what's already done well so it isn't accidentally removed.

- `th-input.component.html` — end icon button uses `[attr.aria-label]="endIconAriaLabel"` — correct conditional pattern
- `th-navbar.component.html` — nav links use `aria-hidden="true"` on decorative icons
- `th-input.component.html` — start icon has `aria-hidden="true"`
- `<add any other good patterns found during audit>`

---

## Part E — Out of Scope

The following were explicitly excluded from this audit:

- Localization / internationalization (i18n)
- Audio/video media content (no media in current app)
- PDF documents
- Native Android UI (Capacitor shell only — WebView content covered above)

---

## Recommended Fix Groups

These are the suggested `/spec-dev` invocations to remediate findings. Each group is a
coherent set of changes that can be implemented in one feature run.

| Group | Covers | Suggested `/spec-dev` description |
|---|---|---|
| 1 — Button names | CRIT-01, CRIT-02, MAJ-0N | `"fix icon-only buttons and accessible names across travelhub"` |
| 2 — Input labels | CRIT-0N, MAJ-0N | `"fix form input label associations and error announcements"` |
| 3 — Live regions | MAJ-0N, MAJ-0N | `"add aria-live regions for loading and error states"` |
| 4 — Portal Hoteles | PH-CRIT-*, PH-MAJ-* | `"fix portal-hoteles accessibility issues"` |
| 5 — Regression guard | All | `"integrate axe-core/playwright into E2E test suite"` |

---

## Appendix — Files Audited

### Travelhub

| File | Checks applied | Findings |
|---|---|---|
| `src/app/pages/home/home.page.html` | CHECK-01 through CHECK-10 | MAJ-0N, MIN-0N |
| `src/app/pages/login/login.page.html` | CHECK-01 through CHECK-10 | CRIT-0N, MAJ-0N |
| `src/app/pages/register/register.page.html` | CHECK-01 through CHECK-10 | — |
| `src/app/pages/search-results/search-results.page.html` | CHECK-01 through CHECK-10 | — |
| `src/app/pages/propertydetail/propertydetail.page.html` | CHECK-01 through CHECK-10 | — |
| `src/app/pages/booking-detail/booking-detail.page.html` | CHECK-01 through CHECK-10 | — |
| `src/app/pages/booking-list/booking-list.page.html` | CHECK-01 through CHECK-10 | — |
| `src/app/shared/components/th-hotel-card/th-hotel-card.component.html` | CHECK-01, 03, 05, 06 | CRIT-0N, MAJ-0N |
| `src/app/shared/components/th-input/th-input.component.html` | CHECK-02, 04 | CRIT-0N |
| `src/app/shared/components/th-filter/th-filter.component.html` | CHECK-02, 03, 08 | CRIT-0N, MAJ-0N |
| `src/app/shared/components/th-navbar/th-navbar.component.html` | CHECK-01, 03, 07 | MAJ-0N |
| `src/app/shared/components/th-button/th-button.component.html` | CHECK-01 | — |
| `[other shared components]` | CHECK-01 through CHECK-10 | — |
| `[scss files]` | CHECK-08, 10 | — |

### Portal Hoteles

| File | Checks applied | Findings |
|---|---|---|
| `projects/portal-hoteles/src/...` | CHECK-01 through CHECK-10, CHECK-09 | — |
| `src/app/shared/components/portal-hoteles/...` | CHECK-01 through CHECK-10, CHECK-09 | — |
```
