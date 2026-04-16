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
5. Generate or update unit tests whenever new functionality is added

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

### Mandatory execution validation

After creating or updating Playwright tests, you must execute the relevant test scope (target file, feature scope, or full suite when appropriate) and validate the results.

If any test fails:

* Diagnose the failure cause
* Apply fixes to tests and/or test setup
* Re-run the tests
* Repeat until the updated tests pass

Do not stop after generating tests without a passing validation run unless execution is impossible in the current environment. In that case, explicitly report the blocker and provide an exact command for local validation.

---

## Phase 3.5: Unit Test Generation

Whenever the application introduces new functionality, generate or update unit tests alongside the implementation.

### Requirements

* Use the AAA pattern in every test:

  * Arrange
  * Act
  * Assert
* Prefer a TDD workflow when it is practical:

  * Write or update tests before or alongside the implementation
  * Let the tests define the expected behavior for the new functionality
* Cover edge cases explicitly:

  * Empty inputs
  * Null or undefined-like values
  * Boundary values
  * Error and fallback paths
  * Branch-specific behavior
* Keep branch coverage at or above the repository pre-commit threshold. For this repository, do not ship changes that fall below the enforced coverage gate.
* Update existing unit tests when functionality changes instead of adding duplicated scenarios.

### Scope

* Add or update unit tests for any changed service, component, pipe, guard, helper, or model behavior that is exercised by the new feature.
* If the new behavior affects multiple code paths, ensure each branch is covered with at least one test.
* When a new feature changes an existing contract, extend tests to verify both the happy path and the failure path.

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

### Mandatory Android execution validation

After regenerating or updating Espresso tests, run the corresponding Android test command when environment prerequisites are available.

If any Espresso test fails:

* Diagnose failure causes
* Fix tests and/or synchronization logic
* Re-run until tests pass

If execution is blocked (e.g., no emulator/device), explicitly report the blocker and provide exact commands to run and validate locally.

---

## 📦 Output

Return:

1. Summary of explored flows
2. Detected flow changes vs existing tests (if any)
3. List of test scenarios
4. Full Playwright test file(s), ready to run
5. Full Android Espresso test file(s), regenerated from the Playwright scenarios
6. Validation checklist (mandatory):

* Commands executed for Playwright and Android validation
* Final result per command (pass/fail and counts when available)
* Number of fix-and-rerun iterations performed
* Any remaining blockers (if execution was not possible) with exact local commands to reproduce/validate

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
