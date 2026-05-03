# Tasks: Digital Check-In

**Based on:** `specs/digital-checkin/PLAN.md`  
**Created:** 2026-05-02  
**Total tasks:** 7  
**Agents involved:** implementation-engineer, test-engineer, review-engineer, devops-engineer, docs-engineer

---

## Phase 4 Execution Plan

```
[1] IMPL-01 + IMPL-02  →  implementation-engineer (parallel — independent services)
[2] TEST-01 + TEST-02  →  test-engineer           (parallel — after their respective IMPL)
[3] RVEW-01            →  review-engineer         (after TEST-01 + TEST-02)
[4] DEVOPS-01          →  devops-engineer  ┐ parallel
    DOCS-01            →  docs-engineer    ┘ (after RVEW-01)
```

---

## Task List

| ID | Agent | Description | Depends On | Status |
|---|---|---|---|---|
| IMPL-01 | implementation-engineer | `booking` service: add `CompleteBookingCommand` to `commands.py`, create `complete_booking.py` use case, wire factory in `bootstrap.py`, add `POST /{booking_id}/complete` route to `controllers.py`. No DB migration needed — `COMPLETED` status already exists. | — | ⬜ pending |
| IMPL-02 | implementation-engineer | `checkin` service (new): scaffold full hexagonal structure — `domain/` (value objects + exceptions), `application/` (3 use cases + ports + commands), `infrastructure/` (SQLAlchemy repo + httpx booking client), `controllers.py` (3 routes), `bootstrap.py`, `schemas.py`, `config.py`, `database.py`, `main.py`, `Dockerfile`, `pyproject.toml`. Tables created via `create_all` on startup. | — | ⬜ pending |
| TEST-01 | test-engineer | `booking` service: unit tests for `CompleteBookingUseCase` (happy path CONFIRMED→COMPLETED, invalid transition from PENDING/CANCELED/COMPLETED, booking not found). Integration test for `POST /api/booking/{id}/complete` via `httpx.AsyncClient`. Target ≥80% coverage on new code. | IMPL-01 | ⬜ pending |
| TEST-02 | test-engineer | `checkin` service: unit tests for all 3 use cases using in-memory repo + mock `BookingClient` — `RegisterPropertyUseCase` (happy path, duplicate property 409), `CheckAvailabilityUseCase` (found/not-found), `PerformCheckInUseCase` (happy path, bad token 400, wrong user 403, booking not found 404, not CONFIRMED 409, property mismatch 400). Integration tests for all 3 controllers via `TestClient`. Target ≥80% coverage. | IMPL-02 | ⬜ pending |
| RVEW-01 | review-engineer | Run `uv run pytest` on both `services/booking` and `services/checkin`. Verify all 8 SPEC.md acceptance criteria are met (AC6–AC8 are frontend, mark as deferred). Check hexagonal layer boundaries in `checkin`. Confirm `POST /complete` has no API Gateway route. Give APPROVED or NEEDS FIXES verdict. | TEST-01, TEST-02 | ⬜ pending |
| DEVOPS-01 | devops-engineer | Add `checkin` to CI/CD: `deploy_apps.yml` test + build_and_push matrix entries. Update Terraform: `container_registry/terraform.tfvars` (add `api_checkin`), `ecs_api/terraform.tfvars` (add `checkin` service block with `create_database=true` and `BOOKING_SERVICE_URL` secret), `api_gateway/terraform.tfvars` (add `checkin` to `service_names`, not `public_services`). Add "Digital Check-In" Postman folder with 3 requests: `POST check-in/available` (register), `GET check-in/available` (check), `POST check-in` (perform). | RVEW-01 | ⬜ pending |
| DOCS-01 | docs-engineer | Update `specs/digital-checkin/SPEC.md` status to Implemented, resolve open questions. Update `CLAUDE.md`: add `checkin` service description under Services, add `POST /api/booking/{id}/complete` to Booking Service API list, add `checkin` to service communication section. Create `services/checkin/README.md` with run commands and env vars. Add FastAPI docstrings to all 3 `checkin` controller routes. | RVEW-01 | ⬜ pending |

---

## Acceptance Criteria Traceability

| Criterion | Implemented by | Tested by | Reviewed by |
|---|---|---|---|
| AC-1: `POST /api/check-in/available` registers property, returns `qr_token`, 409 on duplicate | IMPL-02 | TEST-02 | RVEW-01 |
| AC-2: `GET /api/check-in/available?property_id=X` returns `is_available` bool, JWT required | IMPL-02 | TEST-02 | RVEW-01 |
| AC-3: `POST /api/check-in` with valid CONFIRMED booking + correct token → COMPLETED + `checking` row | IMPL-01, IMPL-02 | TEST-01, TEST-02 | RVEW-01 |
| AC-4: `POST /api/check-in` error cases: 404 (not found), 403 (wrong user), 409 (not CONFIRMED), 400 (bad token) | IMPL-02 | TEST-02 | RVEW-01 |
| AC-5: `POST /api/booking/{id}/complete` transitions CONFIRMED → COMPLETED, 409 on invalid transition | IMPL-01 | TEST-01 | RVEW-01 |
| AC-6: Frontend: booking-detail parallel fetch + conditional QR button | — | — | Deferred (frontend engineer) |
| AC-7: Frontend: QR scanner overlay + `POST /check-in` on scan + success navigation | — | — | Deferred (frontend engineer) |
| AC-8: Frontend: QR button hidden when `is_available` is false | — | — | Deferred (frontend engineer) |

---

## Notes

- IMPL-01 and IMPL-02 are **independent** — they touch different services and can be run in parallel by the implementation-engineer in a single session.
- TEST-01 and TEST-02 are likewise independent and can run in parallel.
- AC-6, AC-7, AC-8 are deferred to the frontend engineer who will implement the `user_interface` changes separately. The review-engineer should mark these as deferred, not failed.
- The `POST /api/booking/{id}/complete` endpoint is VPC-internal only — `devops-engineer` must confirm it is **not** listed in `api_gateway/terraform.tfvars` service routes.
