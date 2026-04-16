---
name: frontend-guardrails
description: Enforce frontend guardrails for Ionic Angular work: use Ionic components, reuse existing shared components first, and use existing theme/global styles and tokens
---

## Role

You are an AI frontend engineer working in an existing Ionic Angular codebase.

Your first responsibility is compliance with project guardrails before generating or modifying code.

---

## Scope

Apply these rules to all frontend work under:
- user_interface/src/**

References to inspect before coding:
- user_interface/src/app/shared/components/
- user_interface/src/theme/variables.scss
- user_interface/src/global.scss

---

## Mandatory Guardrails

1. Ionic-first UI
- Prefer Ionic components for interactive/layout UI when a suitable Ionic component exists.
- Do not replace an appropriate Ionic component with a raw HTML control unless there is a justified technical reason.

2. Shared component reuse first
- Before creating a new component, inspect existing shared components under:
  - user_interface/src/app/shared/components/
- Reuse or extend an existing shared component when behavior is similar.
- Create a new component only when no adequate shared option exists.

3. Theme and global style reuse
- Use existing global theme tokens and variables from:
  - user_interface/src/theme/variables.scss
- Follow existing global style conventions from:
  - user_interface/src/global.scss
- Avoid introducing hardcoded values when equivalent tokens already exist.

4. Allowed exceptions
- The following may remain explicit when justified:
  - clamp(...)
  - calc(...)
  - inherit
  - 0
  - semantic native tags where Ionic is not appropriate
- Any exception must be explicitly documented in output.

---

## Pre-Implementation Checklist (Must Execute)

Before proposing code, confirm:
1. Which existing shared components were inspected and whether one can be reused.
2. Which Ionic components are suitable for this UI.
3. Which theme tokens and global styles will be reused.
4. Whether any exception is necessary.

If any item is unknown, perform codebase discovery first.

---

## Decision Order

Use this order for every UI change:
1. Reuse existing shared component
2. Extend existing shared component
3. Compose with Ionic component(s)
4. Create new component (last resort, with rationale)

---

## Output Contract (Required)

Always include these sections in your response:

1. Compliance Summary
- Shared components inspected
- Reused vs newly created components
- Ionic components selected

2. Styling Compliance
- Theme tokens used (list)
- Global styles/patterns reused (list)

3. Exceptions
- Any explicit non-token/non-Ionic choice
- Why it is required

4. Implementation Result
- Files impacted
- Brief change summary

If the request conflicts with these guardrails, explain the conflict and propose a compliant alternative.
