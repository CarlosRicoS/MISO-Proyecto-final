---
description: "Always-on frontend guardrails for user_interface changes: Ionic-first UI, shared-component reuse, theme/global-style token reuse, accessibility compliance with a11y-audit, UI unit-test discipline, and portal-hoteles/main-project reuse boundaries."
applyTo: "user_interface/{src,projects/portal-hoteles/src}/**/*.{ts,html,scss}"
---

You are working on frontend code in user_interface. Enforce these rules before proposing or applying edits.

Mandatory rules
1. Ionic-first UI
- Prefer Ionic components when suitable.
- Do not replace appropriate Ionic components with raw HTML controls unless required by a technical constraint.

2. Shared-component reuse first
- Before creating a new UI component, inspect existing shared components in user_interface/src/app/shared/components.
- Reuse or extend an existing shared component when behavior is similar.
- Create a new component only when no adequate shared option exists.

3. Theme and global style reuse
- Reuse existing design tokens from user_interface/src/theme/variables.scss.
- Follow global style patterns from user_interface/src/global.scss.
- Do not introduce hardcoded style values when an existing token is available.

4. UI unit-test discipline for new functionality
- When a UI request adds or changes frontend behavior, generate or update unit tests automatically.
- Use AAA structure in each test case:
	- Arrange
	- Act
	- Assert
- Prefer TDD when practical (tests first or in lockstep with implementation).
- Cover edge cases and branch-specific behavior, including:
	- Empty values and invalid input
	- Null/undefined-like values
	- Boundary conditions
	- Error and fallback paths
- Keep branch coverage at or above the enforced pre-commit threshold for frontend tests.
- If the change is styling-only and does not alter behavior, explicitly state why no unit test update is required.

5. SOLID compliance for generated frontend code
- Generated or modified frontend code must follow SOLID principles where applicable:
	- Single Responsibility Principle (SRP): each class/service/component should have one clear responsibility.
	- Open/Closed Principle (OCP): prefer extension over modification for new behavior.
	- Liskov Substitution Principle (LSP): derived/replaced abstractions must preserve expected behavior.
	- Interface Segregation Principle (ISP): avoid large, multipurpose interfaces; keep contracts focused.
	- Dependency Inversion Principle (DIP): depend on abstractions and injectable services instead of concrete implementations where practical.
- Avoid monolithic components/services and avoid mixing unrelated concerns (UI rendering, API orchestration, state persistence) in one unit.
- If a requested quick fix requires a temporary deviation from SOLID, explicitly call out the tradeoff and rationale.

6. Portal-hoteles structure and reuse boundary (mandatory)
- For any new portal-hoteles feature, reuse assets from the main project first: guards, services, shared components, models, and utilities.
- The portal-hoteles project must keep feature code in pages only. Do not create or keep a local core or local shared structure under projects/portal-hoteles/src/app.
- No shared components may exist inside portal-hoteles. If portal-hoteles needs a shared component, create it in user_interface/src/app/shared/components instead.
- For portal-hoteles-specific shared UI, use a nested folder under the main shared path, for example user_interface/src/app/shared/components/portal-hoteles/**.
- Import reusable logic from main-project paths (for example @travelhub/core/* and @travelhub/shared/*).
- When new core elements are needed, create them only under user_interface/src/app/core.
- When new shared components are needed, create them only under user_interface/src/app/shared/components.

7. Accessibility compliance for new UI changes (mandatory)
- Any new or modified UI behavior must comply with accessibility requirements (semantic structure, keyboard access, visible focus states, accessible labels/names, and sufficient contrast).
- Assess accessibility using the a11y-audit skill before finalizing frontend changes.
- If any accessibility issue remains, explicitly report it with impact, rationale, and a remediation plan.

Allowed exceptions
- clamp(...)
- calc(...)
- inherit
- 0
- Semantic native HTML elements when Ionic is not appropriate

If an exception is used, explicitly state why.

Required pre-edit checklist
1. List shared components inspected and reuse decision.
2. List Ionic component options considered.
3. List theme tokens/global patterns to reuse.
4. List any exception needed and rationale.
5. For portal-hoteles work, confirm that no new local core/shared files are introduced under projects/portal-hoteles/src/app.
6. List accessibility checks considered and confirm that a11y-audit was used (or explain why it was not possible).

Required response addendum for frontend changes
1. Compliance summary
- Shared components reused or reason new was required
- Ionic components selected
2. Styling compliance
- Tokens reused from variables.scss
- Global patterns reused from global.scss
3. Testing compliance
- Unit tests added/updated for new UI behavior
- AAA pattern confirmation
- Edge cases covered
- Coverage gate consideration
- If no tests were changed, explicit rationale
4. SOLID compliance
- Brief validation of how the implementation respects SRP/OCP/ISP/DIP as applicable
- Any SOLID tradeoff and rationale
5. Exceptions
- Any exception with rationale
6. Portal-hoteles boundary compliance
- Confirm the feature stays page-only in portal-hoteles and reuses main-project core/shared assets.
7. Accessibility compliance
- Accessibility checks applied for the change
- a11y-audit assessment result
- Any remaining a11y risk and remediation plan
