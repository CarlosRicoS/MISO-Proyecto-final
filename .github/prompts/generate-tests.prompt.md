---

name: generate-e2e-tests
description: Run exploratory testing, maintain Playwright E2E tests, and regenerate Android Espresso tests
----------------------------------------------------------------------

## 🔧 Parameters

* url: {{url}}
* email: {{email}}
* password: {{password}}
* notes: {{notes}}

---

You are an automated QA agent using Playwright.

Your task is to:

1. Perform exploratory testing on the provided application
2. Identify key user flows and detect flow changes
3. Generate or update production-ready Playwright E2E tests
4. Regenerate Android Espresso tests from the final Playwright tests

---

## 🌐 Target

Base URL: {{url}}

If credentials are provided:

* Email: {{email}}
* Password: {{password}}

Additional context:
{{notes}}

---

## Phase 1: Exploratory Testing

* Navigate to {{url}}

* Explore like a real user:

  * Click links, buttons, menus
  * Interact with forms, modals, dropdowns
  * Trigger edge cases (empty states, invalid input, errors)

* If login is required and credentials exist:

  * Perform authentication flow

* Identify:

  * Core flows (login, search, booking, checkout, etc.)
  * UI inconsistencies
  * Error states

* Capture:

  * Stable selectors (getByRole, getByLabel, getByTestId)
  * Navigation paths
  * Required test data

---

## Phase 2: Flow Identification

Extract key journeys:

* Happy paths
* Critical business flows
* High-risk interactions

---

## Phase 3: Playwright Test Generation

Generate Playwright tests using:

* @playwright/test
* test.describe()
* test.beforeEach() when useful

If Playwright tests already exist:

* Compare existing tests with observed behavior and identified flows
* Update existing tests instead of duplicating scenarios
* Keep naming and folder conventions stable when possible
* Remove or replace outdated assertions/selectors when flow changes require it

If no tests exist:

* Create a new Playwright test suite from scratch

### Requirements

* Use reliable selectors:

  * getByRole
  * getByLabel
  * getByTestId
* Avoid brittle selectors
* Include:

  * Assertions (expect)
  * Proper waits (no timeouts)
* Tests must be:

  * Independent
  * Deterministic
  * Readable

### Authentication

If login is required:

* Include login step or reusable helper

---

## Phase 4: Android Test Regeneration (Espresso)

Using the final Playwright coverage as the source of truth:

* Regenerate Android Espresso tests that mirror the same core scenarios
* Ensure Android tests reflect any updated web flows
* Keep Android tests in sync with selectors and expected outcomes used by Playwright where feasible
* Prefer deterministic checks and robust waits in Android tests

When Android tests already exist:

* Update existing tests to match the new Playwright scenarios
* Remove stale Android scenarios that no longer represent product behavior

When Android tests do not exist:

* Create a baseline Espresso suite mapped from the generated Playwright flows

---

## 📦 Output

Return:

1. Summary of explored flows
2. Detected flow changes vs existing tests (if any)
3. List of test scenarios
4. Full Playwright test file(s), ready to run
5. Full Android Espresso test file(s), regenerated from the Playwright scenarios

---

## 🚫 Constraints

* Do not hardcode fragile selectors
* Do not assume hidden features
* Keep tests CI-ready
* Do not duplicate existing scenarios when an update is sufficient
* Keep Playwright and Android scenario parity

---

## 🎯 Goal

Produce high-quality Playwright E2E tests for {{url}} and keep Android Espresso tests regenerated from them so both suites remain aligned for CI/CD.
