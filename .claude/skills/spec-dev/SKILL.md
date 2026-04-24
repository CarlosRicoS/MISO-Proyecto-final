---
name: spec-dev
description: >
  Spec-driven development skill for structured feature development using a 4-phase gated
  workflow: Specify → Plan → Tasks → Implement. Use this skill whenever the user wants to
  implement a new feature in a disciplined, structured way. Trigger for phrases like
  "spec-dev", "implement a feature", "build a feature with spec", "spec-driven", "add feature
  using structured workflow", "let's spec out a feature", "I want to build X properly", or any
  request to add a new feature to the platform that would benefit from explicit planning before
  coding. Each phase produces a persistent artifact (SPEC.md, PLAN.md, TASKS.md) committed to
  the specs/ directory. Phase 4 orchestrates 5 specialist agents: implementation-engineer,
  test-engineer, review-engineer, devops-engineer, and docs-engineer.
---

# Spec-Driven Development

This skill enforces a disciplined 4-phase gated workflow for building new features. Each phase
produces a persistent artifact. No phase begins until the user explicitly approves the previous
one. Phase 4 is executed by 5 specialist agents, each owning a distinct concern.

## When to use

- User wants to build a new feature with explicit planning before coding
- User invokes `/spec-dev <feature description>`
- User asks to "spec out", "design", or "plan and implement" a feature

## Workflow overview

```
PHASE 1: Specify  →  SPEC.md    (what & why)
PHASE 2: Plan     →  PLAN.md    (how & where)
PHASE 3: Tasks    →  TASKS.md   (task breakdown)
PHASE 4: Implement →  Code      (5 agents, sequential)
```

Each phase ends with a **soft gate** — Claude presents a summary and asks for explicit user
approval before proceeding. The user can also type corrections to revise the artifact before
continuing.

---

## Step 1: SPECIFY

### 1.1 — Parse the feature description

Extract the feature description from the invocation argument. If the user invoked the skill
with no argument (just `/spec-dev`), ask:

> "What feature would you like to build? Please describe it in a sentence or two."

### 1.2 — Explore the codebase

Before surfacing assumptions, read the following to understand context:
- `CLAUDE.md` — architecture overview, service descriptions, patterns
- Run `ls -1 services/` and `ls -1 user_interface/src/app/` to identify available services and pages
- For each likely affected service, read:
  1. `controllers.py` or main controller class to see existing endpoint patterns
  2. One domain entity or Command class to understand the architecture pattern
  3. `README.md` (if present) for domain-specific constraints

Identify:
- Which services are affected (Python/FastAPI, Java/Spring Boot, .NET, Angular)
- Existing patterns in those services (hexagonal, CQRS, etc.)
- Auth requirements (JWT needed? X-User-Id forwarded?)
- Database involvement (which service, migrations needed?)

### 1.3 — Surface assumptions

Present a numbered assumption list with **exactly 10 items** (use the structure below as a template — adjust the content, not the count):

```
Assumptions I'm making about "<feature name>":

1. Scope: [what is and isn't included]
2. Affected services: [list with languages]
3. New API endpoints: [list or "none"]
4. Database changes: [describe or "none"]
5. Authentication: [JWT required? which services?]
6. Cross-service calls: [which services call which]
7. Postman collection: [new folder/requests needed?]
8. CI/CD changes: [new service in pipeline? or "no changes"]
9. Out of scope: [explicit exclusions]
10. Open questions: [anything unclear]

Do you approve these assumptions, or should I adjust any?
(Type corrections, additions, or 'proceed' to continue.)
```

### 1.4 — Generate SPEC.md

After user approval, determine the feature slug using these rules:
- Use kebab-case (lowercase, hyphens, no underscores or spaces)
- Include the verb if it clarifies the action: `add-property-ratings`, `update-booking-status`
- If the slug would exceed 50 characters, abbreviate: `add-jwt-refresh-flow` not `add-json-web-token-refresh-token-flow`
- Never use dates or version numbers in slugs
- If a `specs/<slug>/` directory already exists, append `-2` (e.g., `add-property-ratings-2`)
- Example: "Allow users to rate properties" → `add-property-ratings`

Read `references/spec-template.md` for the exact template, then write:
```
specs/<feature-slug>/SPEC.md
```

**Soft gate:**
> "SPEC.md has been written to `specs/<slug>/SPEC.md`. Review it, make any edits directly,
> then type **'proceed to plan'** to continue to Phase 2."

---

## Step 2: PLAN

### 2.1 — Read spec

Read `specs/<slug>/SPEC.md` fully.

### 2.2 — Deep technical analysis

For each affected service identified in the spec, read in this order:
1. `main.py` or `pom.xml` to confirm build/run setup
2. `controllers.py` (Python) or main `@RestController` (Java) or `Program.cs` (.NET) to see endpoint patterns
3. One existing domain entity or Command/Query class to confirm the architecture pattern
4. `README.md` if it exists — may contain domain constraints (e.g., "all dates must be UTC")

Then identify exact files to create and modify (with full paths) and determine patterns to follow:
  - Python services: hexagonal arch (domain / application / infrastructure / controllers.py)
  - `poc_properties` (Java): CQRS (Command/Query classes, handlers, MapStruct mappers)
  - `.NET` services: EF Core, Npgsql, controller or minimal API
  - `user_interface` (Angular): lazy-loaded routing, Ionic components, TypeScript strict

### 2.3 — Generate PLAN.md

Read `references/plan-template.md` for the exact template, then write:
```
specs/<feature-slug>/PLAN.md
```

**Soft gate:**
> "PLAN.md has been written to `specs/<slug>/PLAN.md`. Review the technical approach — pay
> special attention to the file list and interface contracts — then type **'proceed to tasks'**
> to continue to Phase 3."

---

## Step 3: TASKS

### 3.1 — Read plan

Read `specs/<slug>/PLAN.md` fully.

### 3.2 — Decompose into atomic tasks

Break the plan into tasks where each task:
- Is assigned to exactly one agent
- Has a clear, testable description
- Has explicit dependencies listed

**Task ID rules:**
- Prefix by agent type: `IMPL-*`, `TEST-*`, `RVEW-*`, `DEVOPS-*`, `DOCS-*`
- Sequential numbering within each prefix starting at `01`: IMPL-01, IMPL-02, TEST-01, etc.
- `RVEW-01` always exists (exactly one review task); it depends on ALL `TEST-*` tasks
- `DEVOPS-01` and `DOCS-01` always exist (one per agent); both depend on `RVEW-01`
- If a service is NOT affected, omit its `IMPL-*` and `TEST-*` tasks entirely — do not create placeholders

Example for a 2-service feature (2 backends, no frontend):
```
IMPL-01  implementation-engineer  Backend: <service 1> changes
IMPL-02  implementation-engineer  Backend: <service 2> changes
TEST-01  test-engineer            Unit + E2E tests: <service 1>  (depends: IMPL-01)
TEST-02  test-engineer            Unit + E2E tests: <service 2>  (depends: IMPL-02)
RVEW-01  review-engineer         Verify all tests + review vs SPEC.md  (depends: TEST-01, TEST-02)
DEVOPS-01 devops-engineer        Update CI/CD + Postman collection  (depends: RVEW-01)
DOCS-01  docs-engineer           Sync SPEC.md, CLAUDE.md, service docs  (depends: RVEW-01)
```

Example for a full-stack feature (2 backends + frontend):
```
IMPL-01  implementation-engineer  Backend: <service 1> changes
IMPL-02  implementation-engineer  Backend: <service 2> changes
IMPL-03  implementation-engineer  Frontend: user_interface changes  (depends: IMPL-01)
TEST-01  test-engineer            Unit + E2E tests: <service 1>  (depends: IMPL-01)
TEST-02  test-engineer            Unit + E2E tests: <service 2>  (depends: IMPL-02)
TEST-03  test-engineer            Unit + E2E tests: frontend  (depends: IMPL-03)
RVEW-01  review-engineer         Verify all tests + review vs SPEC.md  (depends: TEST-01, TEST-02, TEST-03)
DEVOPS-01 devops-engineer        Update CI/CD + Postman collection  (depends: RVEW-01)
DOCS-01  docs-engineer           Sync SPEC.md, CLAUDE.md, service docs  (depends: RVEW-01)
```

### 3.3 — Generate TASKS.md

Read `references/tasks-template.md` for the exact template, then write:
```
specs/<feature-slug>/TASKS.md
```

Use `TaskCreate` to create in-session task entries for each task in TASKS.md.

**Soft gate:**
> "TASKS.md has been written with N tasks across 5 agents. Review the task breakdown,
> then type **'implement'** to begin Phase 4."

---

## Step 4: IMPLEMENT

Read `references/phase4-agents.md` before running any agents — it contains the exact prompt
templates and context instructions for each specialist agent.

### Execution order

Agents run **sequentially** by default. After `review-engineer` passes, `devops-engineer` and
`docs-engineer` can run **in parallel** (they touch disjoint file sets).

```
[1] implementation-engineer   writes production code
[2] test-engineer              writes + runs tests (80% coverage target)
[3] review-engineer            verifies tests + reviews vs SPEC.md
[4] devops-engineer  ┐         updates CI/CD + Postman
[5] docs-engineer    ┘ parallel updates SPEC.md, CLAUDE.md, service docs
```

### Soft gate structure

Gates differ between agents 1–3 (sequential) and agents 4–5 (parallel):

**Agents 1, 2, 3 — individual gate before each:**
> "Ready to run **<agent-name>**. Proceed? (yes / skip / stop)"
> - `yes` → launch agent
> - `skip` → skip this agent, continue to next
> - `stop` → end Phase 4 here

**Agents 4 + 5 — single shared gate after review-engineer approves:**
> "Ready to run **devops-engineer** and **docs-engineer** in parallel. Proceed?
> (yes / skip-devops / skip-docs / skip-both / stop)"
> - `yes` → invoke both agents simultaneously (two `Agent` tool calls in one response)
> - `skip-devops` → run docs-engineer only
> - `skip-docs` → run devops-engineer only
> - `skip-both` → skip both, go to completion
> - `stop` → end Phase 4 here

### If review-engineer returns NEEDS FIXES

Do NOT proceed to devops-engineer or docs-engineer. Instead:
1. Present the blocking issues to the user clearly
2. Ask: "Who should fix this? (implementation-engineer / test-engineer / both)"
3. Re-run the chosen agent(s) with the blocking issues listed in the prompt
4. Re-run review-engineer
5. Repeat until review-engineer returns **APPROVED**

### Marking tasks complete

After each agent finishes, update the corresponding task(s) in TASKS.md status column
to `✅ done` and call `TaskUpdate` with `completed` status.

### Phase 4 completion

After all agents finish:
> "Phase 4 complete. Summary:
> - implementation-engineer: [done/skipped]
> - test-engineer: [done/skipped]
> - review-engineer: [done/skipped]
> - devops-engineer: [done/skipped]
> - docs-engineer: [done/skipped]
>
> Artifacts in `specs/<slug>/`. Ready to create a PR?"

---

## Reference files

Read these at the appropriate step:

| File | When | Contains |
|---|---|---|
| `references/spec-template.md` | Step 1.4 | Exact SPEC.md template |
| `references/plan-template.md` | Step 2.3 | Exact PLAN.md template |
| `references/tasks-template.md` | Step 3.3 | Exact TASKS.md template |
| `references/phase4-agents.md` | Step 4 start | Agent prompt templates + context guide |
