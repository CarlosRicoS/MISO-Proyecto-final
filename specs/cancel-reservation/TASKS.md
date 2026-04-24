# Tasks: Cancel Reservation with Policy-Based Refund

**Based on:** `specs/cancel-reservation/PLAN.md`  
**Created:** 2026-04-24  
**Total tasks:** 7  
**Agents involved:** implementation-engineer, test-engineer, review-engineer, devops-engineer, docs-engineer

---

## Phase 4 Execution Plan

```
[1] IMPL-01  implementation-engineer  booking_orchestrator — domain, adapters, saga, new endpoint
[2] IMPL-02  implementation-engineer  notifications — event schema + email template
[3] TEST-01  test-engineer            booking_orchestrator tests  (after IMPL-01)
[4] TEST-02  test-engineer            notifications tests         (after IMPL-02)
[5] RVEW-01  review-engineer          verify all tests + SPEC.md  (after TEST-01, TEST-02)
[6] DEVOPS-01 + DOCS-01              parallel                     (after RVEW-01)
```

---

## Task List

| ID | Agent | Description | Depends On | Status |
|---|---|---|---|---|
| IMPL-01 | implementation-engineer | `booking_orchestrator`: (1) create `domain/cancellation_policy.py` with `compute_cancellation_policy()` and `CancellationPolicy` dataclass; (2) add `refund_amount`+`penalty_amount` to `BookingCancelledEvent` in `domain/events.py`; (3) extend `PropertyClient` with `unlock()` and `BillingPublisher` with `publish_cancel()` in `application/ports.py`; (4) add `unlock()` to `infrastructure/httpx_property_client.py`; (5) add `publish_cancel()` to `infrastructure/sqs_billing_publisher.py`; (6) add `GetCancellationPolicyCommand` to `application/commands.py`; (7) create `application/get_cancellation_policy.py` use case; (8) enhance `application/cancel_reservation.py` with property_client + billing_publisher deps, unlock step, billing cancel step, and policy fields in the event; (9) update `bootstrap.py` wiring; (10) add `CancellationPolicyResponse` to `schemas.py`; (11) add `GET /api/reservations/{booking_id}/cancellation-policy` to `controllers.py`. | — | ⬜ pending |
| IMPL-02 | implementation-engineer | `notifications`: (1) add `refund_amount: str` and `penalty_amount: str` to `BookingCancelledEvent` in `domain/events.py` with `.get(..., "0.00")` defaults in `from_message()` for backward compat; (2) update `application/handle_booking_cancelled.py` email body to include refund and penalty amounts. | — | ⬜ pending |
| TEST-01 | test-engineer | `booking_orchestrator` tests: (1) unit-test `compute_cancellation_policy()` for all policy branches (free, penalty, no payment); (2) unit-test `GetCancellationPolicyUseCase` mocking `BookingClient`; (3) unit-test enhanced `CancelReservationUseCase` verifying unlock call, billing cancel call (when payment_reference set), no billing call (when not set), and correct fields in the published event; (4) unit-test `HttpxPropertyClient.unlock()` and `SqsBillingPublisher.publish_cancel()`; (5) Playwright E2E stub test for `GET /api/reservations/{id}/cancellation-policy` returning 200 and 404. Target ≥ 80% coverage on new code. | IMPL-01 | ⬜ pending |
| TEST-02 | test-engineer | `notifications` tests: (1) unit-test `HandleBookingCancelled` with refund_amount > 0 (free cancellation), with penalty_amount > 0 (penalty case), and with both = 0 (no payment); (2) unit-test `BookingCancelledEvent.from_message()` with and without `refund_amount`/`penalty_amount` fields (backward-compat check). Target ≥ 80% coverage on new code. | IMPL-02 | ⬜ pending |
| RVEW-01 | review-engineer | Run `uv run pytest tests/ -v` in both `services/booking_orchestrator` and `services/notifications`. Verify all 11 SPEC.md acceptance criteria are met. Flag any doc gaps or missing error-case coverage. | TEST-01, TEST-02 | ⬜ pending |
| DEVOPS-01 | devops-engineer | Update Postman collection: add `GET /api/reservations/{booking_id}/cancellation-policy` request to the booking-orchestrator folder with example response. No CI/CD changes needed (no new services). | RVEW-01 | ⬜ pending |
| DOCS-01 | docs-engineer | (1) Set SPEC.md status to `Implemented` and resolve open questions; (2) Update `services/booking_orchestrator/README.md` with the new endpoint and the two new infrastructure adapter methods; (3) Update `CLAUDE.md` booking_orchestrator service description to mention property unlock and billing cancel on cancellation; (4) Add inline docstrings to `compute_cancellation_policy()` and `GetCancellationPolicyUseCase`. | RVEW-01 | ⬜ pending |

---

## Acceptance Criteria Traceability

| Criterion | Implemented by | Tested by | Reviewed by |
|---|---|---|---|
| AC-1: GET cancellation-policy returns is_free, refund_amount, penalty_amount, deadline | IMPL-01 | TEST-01 | RVEW-01 |
| AC-2: ≥ 24h before check-in → is_free = true, refund = price, penalty = 0 | IMPL-01 | TEST-01 | RVEW-01 |
| AC-3: < 24h before check-in → is_free = false, refund = price×0.5, penalty = price×0.5 | IMPL-01 | TEST-01 | RVEW-01 |
| AC-4: payment_reference = null → refund = 0, penalty = 0 regardless of timing | IMPL-01 | TEST-01 | RVEW-01 |
| AC-5: POST cancel marks booking CANCELED in booking service | IMPL-01 | TEST-01 | RVEW-01 |
| AC-6: POST cancel calls POST /api/property/unlock (best-effort) | IMPL-01 | TEST-01 | RVEW-01 |
| AC-7: POST cancel publishes billing CANCEL to billing_queue if payment_reference set | IMPL-01 | TEST-01 | RVEW-01 |
| AC-8: BOOKING_CANCELLED event includes refund_amount and penalty_amount | IMPL-01 | TEST-01 | RVEW-01 |
| AC-9: cancellation email includes refund and penalty amounts | IMPL-02 | TEST-02 | RVEW-01 |
| AC-10: GET cancellation-policy returns 404 if booking not found | IMPL-01 | TEST-01 | RVEW-01 |
| AC-11: POST cancel returns 409 if booking is in terminal state | IMPL-01 (existing behavior) | TEST-01 | RVEW-01 |

---

## Notes

- IMPL-01 and IMPL-02 are independent and can be worked on in parallel, but will be run sequentially by the implementation-engineer (one agent, one session).
- No changes to `booking` service, `poc_properties`, or `billing` — they already implement the right contracts.
- The cancel saga unlock step uses `PropertyLockError` (existing exception) — no new exception class needed.
- `TEST-01` should inject a fake `datetime.now()` via the `now` parameter of `compute_cancellation_policy()` — no clock mocking needed.
