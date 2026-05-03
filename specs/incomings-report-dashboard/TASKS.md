# Tasks: Incoming Report & Executive Dashboard Metrics

**Based on:** `specs/incomings-report-dashboard/PLAN.md`  
**Created:** 2026-05-03  
**Total tasks:** 5  
**Agents involved:** implementation-engineer, test-engineer, review-engineer, devops-engineer, docs-engineer

---

## Phase 4 Execution Plan

```
[1] IMPL-01  →  implementation-engineer  (new incomings_report service)
[2] TEST-01  →  test-engineer            (after IMPL-01)
[3] RVEW-01  →  review-engineer         (after TEST-01)
[4] DEVOPS-01 + DOCS-01  →  parallel    (after RVEW-01)
```

---

## Task List

| ID | Agent | Description | Depends On | Status |
|---|---|---|---|---|
| IMPL-01 | implementation-engineer | New `services/incomings_report/` Python/FastAPI hexagonal service — 4 endpoints, two SQLAlchemy engines (ReportsDB + BillingDB read-only), upsert-on-read sync logic, CSV StreamingResponse, in-memory repo for testing | — | ⬜ pending |
| TEST-01 | test-engineer | Unit tests for `incomings_report` — domain entities, use cases (via in-memory repo), controllers (FastAPI TestClient). Target ≥80% coverage. | IMPL-01 | ⬜ pending |
| RVEW-01 | review-engineer | Run pytest, verify all 8 acceptance criteria met, check for TODOs/hardcoded secrets, flag doc gaps | TEST-01 | ⬜ pending |
| DEVOPS-01 | devops-engineer | Add `incomings-report` to CI/CD matrix (deploy_apps.yml, pr_validation.yml), Terraform tfvars (container_registry, ecs_api, api_gateway), and Postman collection | RVEW-01 | ⬜ pending |
| DOCS-01 | docs-engineer | Update SPEC.md (resolve open questions, set status Implemented), CLAUDE.md (new service entry), service README, endpoint docstrings | RVEW-01 | ⬜ pending |

---

## Acceptance Criteria Traceability

| Criterion | Implemented by | Tested by | Reviewed by |
|---|---|---|---|
| AC-1: GET /api/reports/incoming returns all report records | IMPL-01 | TEST-01 | RVEW-01 |
| AC-2: Upsert from BillingDB with 7.5% tax + 5% commission applied | IMPL-01 | TEST-01 | RVEW-01 |
| AC-3: GET /api/reports/revenue-overview returns monthly aggregation | IMPL-01 | TEST-01 | RVEW-01 |
| AC-4: GET /api/reports/dashboard-metrics returns KPI object | IMPL-01 | TEST-01 | RVEW-01 |
| AC-5: GET /api/reports/incoming/csv streams UTF-8 BOM CSV | IMPL-01 | TEST-01 | RVEW-01 |
| AC-6: All endpoints require JWT (missing X-User-Id → 422) | IMPL-01 | TEST-01 | RVEW-01 |
| AC-7: revenue-overview responds < 2s p95 for 12 months | IMPL-01 | TEST-01 | RVEW-01 |
| AC-8: Unit test coverage ≥ 80% | TEST-01 | TEST-01 | RVEW-01 |

---

## Notes

- `user_interface` is explicitly out of scope for this implementation
- In-memory repository (`InMemoryReportRepository`) must be created by implementation-engineer so test-engineer can inject it without touching real DBs
- BillingDB read-only engine must NOT have `create_all` called on startup — only the ReportsDB engine creates tables
- `state` field in BillingDB `billing` table is a plain string (confirmed from `BillingEntity.java`) — no JOIN needed
