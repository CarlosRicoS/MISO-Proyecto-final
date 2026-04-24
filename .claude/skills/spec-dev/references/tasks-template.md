# TASKS.md Template

Use this exact structure when writing `specs/<feature-slug>/TASKS.md`.
Each task maps to one agent action in Phase 4.

---

```markdown
# Tasks: <Feature Name>

**Based on:** `specs/<slug>/PLAN.md`  
**Created:** <YYYY-MM-DD>  
**Total tasks:** N  
**Agents involved:** implementation-engineer, test-engineer, review-engineer, devops-engineer, docs-engineer

---

## Phase 4 Execution Plan

```
[1] IMPL tasks    →  implementation-engineer (sequential or parallel per service)
[2] TEST tasks    →  test-engineer           (after implementation)
[3] RVEW task     →  review-engineer         (after tests)
[4] DEVOPS + DOCS →  devops-engineer         (parallel)
                     docs-engineer           (parallel)
```

---

## Task List

| ID | Agent | Description | Depends On | Status |
|---|---|---|---|---|
| IMPL-01 | implementation-engineer | <Backend: service 1 — describe changes> | — | ⬜ pending |
| IMPL-02 | implementation-engineer | <Backend: service 2 — describe changes> | — | ⬜ pending |
| IMPL-03 | implementation-engineer | <Frontend: user_interface — describe changes> | IMPL-01 | ⬜ pending |
| TEST-01 | test-engineer | <Unit tests: service 1 — 80% coverage target> | IMPL-01 | ⬜ pending |
| TEST-02 | test-engineer | <Unit tests: service 2 — 80% coverage target> | IMPL-02 | ⬜ pending |
| TEST-03 | test-engineer | <Unit tests: frontend — 80% coverage target> | IMPL-03 | ⬜ pending |
| RVEW-01 | review-engineer | Verify all test suites pass. Review implementation vs SPEC.md acceptance criteria. Flag doc gaps. | TEST-01, TEST-02, TEST-03 | ⬜ pending |
| DEVOPS-01 | devops-engineer | Update CI/CD pipelines (if new services). Update Postman collection with new endpoints. | RVEW-01 | ⬜ pending |
| DOCS-01 | docs-engineer | Sync SPEC.md open questions. Update CLAUDE.md if architecture changed. Update service README and API docs (docstrings / Swagger annotations). | RVEW-01 | ⬜ pending |

---

## Acceptance Criteria Traceability

Map each SPEC.md acceptance criterion to the task(s) that implement and verify it:

| Criterion | Implemented by | Tested by | Reviewed by |
|---|---|---|---|
| AC-1: <criterion text> | IMPL-01 | TEST-01 | RVEW-01 |
| AC-2: <criterion text> | IMPL-02 | TEST-02 | RVEW-01 |

---

## Notes

- If a service is NOT affected, omit its IMPL/TEST tasks entirely
- The review-engineer will run all test suites via the language-specific test commands
- devops-engineer and docs-engineer run in parallel after RVEW-01 passes
```
