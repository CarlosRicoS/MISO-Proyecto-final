---
name: add-component-with-guardrails
description: Run frontend guardrails first, then execute component generation flow in the same session
---

## Purpose

Compose two prompt workflows in order:
1. frontend-guardrails
2. add-component

Do not duplicate policy text from frontend-guardrails.

---

## Execution Order

1. Activate guardrails from frontend-guardrails and keep them active for the full task.
2. Execute component generation flow from add-component.
3. Preserve guardrail compliance in all proposed changes.

---

## Required Response Sections

1. Active Guardrails
- Restate the guardrails being enforced for this task.

2. Generation Plan
- Component work planned from add-component flow.

3. Compliance Result
- Evidence of shared component reuse checks
- Ionic usage decisions
- Theme/global style token reuse
- Exception list (if any)
