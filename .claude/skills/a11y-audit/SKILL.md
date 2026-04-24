---
name: a11y-audit
description: >
  Accessibility audit skill for the TravelHub Angular/Ionic application. Performs a
  two-phase audit: static analysis of Angular templates and SCSS for WCAG 2.1 AA violations,
  followed by a guided live axe-core/Playwright scan when the dev server is available.
  Produces a structured a11y-report.md with Critical/Major/Minor findings and generates
  ready-to-use /spec-dev invocations to fix each group of issues. Covers both the travelhub
  app (src/app/) and the portal-hoteles app (projects/portal-hoteles/). Invoke with
  /a11y-audit to start a full audit, or /a11y-audit --static for static analysis only.
---

# Accessibility Audit — TravelHub

This skill audits the Angular 20 / Ionic 8 application for WCAG 2.1 AA compliance.
It runs in two phases: static code analysis first (no running app needed), then a guided
live scan using axe-core when the dev server is available.

## When to use

- Run before submitting a PR that touches UI components
- Run periodically to catch accessibility regressions
- Run once after major UI refactors to establish a baseline

---

## Phase 1: Static Analysis

### 1.1 — Read the analysis guide

Read `references/static-analysis-guide.md` fully before scanning any files. It contains
the exact patterns to search for in this codebase's Angular/Ionic templates.

### 1.2 — Scan travelhub app

Scan these directories:
```
user_interface/src/app/pages/
user_interface/src/app/shared/components/
user_interface/src/app/shared/  (any other shared files)
```

For each `.html` template and `.scss` file found, apply the checks in
`references/static-analysis-guide.md`. Log every finding with:
- File path and line number
- Issue category (from the guide)
- WCAG criterion violated
- Severity: Critical / Major / Minor

### 1.3 — Scan portal-hoteles app

Repeat the same scan for:
```
user_interface/projects/portal-hoteles/src/
```

Log findings separately under a "Portal Hoteles" section.

### 1.4 — Soft gate after static analysis

Present a summary:
> "Static analysis complete.
> Travelhub: N Critical, N Major, N Minor issues found.
> Portal Hoteles: N Critical, N Major, N Minor issues found.
>
> Proceed to Phase 2 (live axe scan)? (yes / skip-live / report-now)"
> - `yes` → continue to Phase 2
> - `skip-live` → skip live scan, go directly to report
> - `report-now` → generate report from static findings only

---

## Phase 2: Guided Live Scan

### 2.1 — Instruct user to start dev servers

Present these instructions:

> "Phase 2 requires the Angular dev servers running locally.
>
> Open two terminals and run:
> ```bash
> # Terminal 1 — travelhub
> cd user_interface && npm start
>
> # Terminal 2 — portal-hoteles
> cd user_interface && npm run start:portal-hoteles
> ```
>
> Once both are running at localhost:4200 and localhost:4201, type 'ready'."

### 2.2 — Provide axe scan commands

After user confirms servers are running, present the exact commands to run:

> "Run these commands in the `user_interface/` directory:
>
> ```bash
> # Install axe if not already present
> npm install --save-dev @axe-core/playwright
>
> # Travelhub axe scan
> npx playwright test e2e/web/ --reporter=list
>
> # Portal-hoteles axe scan
> npx playwright test --config=playwright-portal-hoteles.config.ts --reporter=list
> ```
>
> **Note:** axe assertions are not yet wired into the E2E tests. Until the
> accessibility-engineer adds them (as part of fixing found issues), paste the
> browser console output from manually running axe on each page:
> ```javascript
> // Paste this in browser DevTools console on each page:
> const axe = await import('https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.0/axe.min.js');
> const results = await axe.run();
> console.log(JSON.stringify(results.violations, null, 2));
> ```
>
> Paste the violation output here for each page you check."

### 2.3 — Parse pasted axe output

For each violation in the pasted output, log:
- Rule ID (e.g., `color-contrast`, `label`, `button-name`)
- Impact: critical / serious / moderate / minor
- Affected element (CSS selector or description)
- WCAG criterion

### 2.4 — Soft gate after live scan

> "Live scan results processed.
> Additional axe findings: N Critical, N Serious, N Moderate.
>
> Proceed to generate the full report? (yes / stop)"

---

## Phase 3: Generate Report

Read `references/report-template.md` for the exact structure, then write:
```
specs/a11y-audit/a11y-report.md
```

Merge static analysis findings and axe scan findings. Deduplicate overlapping issues.
Assign a finding ID to each issue: `CRIT-01`, `MAJ-01`, `MIN-01` etc.

**Soft gate:**
> "a11y-report.md written to `specs/a11y-audit/a11y-report.md`.
> Review it, make any edits, then type 'bridge' to generate spec-dev features."

---

## Phase 4: Bridge to spec-dev

Group related findings into logical feature units — each group should represent a coherent
set of fixes that one spec-dev run can implement together. Present suggested invocations:

```
Suggested /spec-dev features (run each separately):

1. /spec-dev "fix icon-only buttons and missing accessible names across travelhub"
   Covers: CRIT-01, CRIT-02, MAJ-03

2. /spec-dev "fix form input labels and error announcements in auth and booking flows"
   Covers: CRIT-03, MAJ-01, MAJ-02

3. /spec-dev "add focus management and live regions for dynamic content"
   Covers: MAJ-04, MAJ-05, MAJ-06

4. /spec-dev "fix portal-hoteles accessibility issues"
   Covers: [portal-hoteles findings]

5. /spec-dev "integrate axe-core/playwright into E2E test suite"
   Covers: all — prevents regressions

Which would you like to start with? (type the number or 'all' to queue them)"
```

When the user picks a number, invoke the spec-dev skill with the suggested description,
passing a note that the `accessibility-engineer` agent should be used in Phase 4.

---

## Reference files

| File | When | Contains |
|---|---|---|
| `references/static-analysis-guide.md` | Phase 1 start | Exact patterns to find in Angular/Ionic templates |
| `references/wcag-checklist.md` | Throughout | WCAG 2.1 AA criteria relevant to this app |
| `references/report-template.md` | Phase 3 | Exact a11y-report.md structure |
