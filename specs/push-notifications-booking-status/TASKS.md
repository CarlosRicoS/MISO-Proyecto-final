# Tasks: Push Notifications for Booking Status Changes

**Based on:** `specs/push-notifications-booking-status/PLAN.md`  
**Created:** 2026-04-24  
**Total tasks:** 6  
**Agents involved:** implementation-engineer, test-engineer, review-engineer, devops-engineer, docs-engineer

---

## Phase 4 Execution Plan

```
[1] IMPL-01, IMPL-02  →  implementation-engineer (IMPL-02 independent of IMPL-01)
[2] TEST-01           →  test-engineer           (after IMPL-01)
[3] RVEW-01           →  review-engineer         (after TEST-01)
[4] DEVOPS-01         →  devops-engineer  ┐ parallel
    DOCS-01           →  docs-engineer    ┘ parallel
```

---

## Task List

| ID | Agent | Description | Depends On | Status |
|---|---|---|---|---|
| IMPL-01 | implementation-engineer | `services/notifications/`: add `PushSender` Protocol to `ports.py`; create `infrastructure/ssm_token_registry.py` and `infrastructure/fcm_push_sender.py`; update all 7 handlers to accept and call `push_sender`; add `_NoOpPushSender` guard and wire `FcmPushSender`+`SsmTokenRegistry` in `bootstrap.py`; add new settings to `config.py`; add `firebase-admin>=6.0.0` to `pyproject.toml` | — | ⬜ pending |
| IMPL-02 | implementation-engineer | `.github/workflows/register_push_token.yml`: new `workflow_dispatch` workflow that reads `/final-project-miso/notifications/fcm-tokens` from SSM, upserts the FCM token for the given `user_id` using `jq`, and writes back with `--overwrite` | — | ⬜ pending |
| TEST-01 | test-engineer | `services/notifications/` tests: (1) `tests/infrastructure/test_ssm_token_registry.py` — happy path, missing param, SSM error; (2) `tests/infrastructure/test_fcm_push_sender.py` — sends to all tokens, skips when no tokens, logs warning on send failure; (3) update all 7 `tests/application/test_handle_*.py` to inject a `SpyPush` alongside `SpyEmail` and assert push is called with correct user_id/title/body; (4) `tests/test_bootstrap.py` — assert no-op path when credentials missing. Target: ≥80% coverage on new code | IMPL-01 | ⬜ pending |
| RVEW-01 | review-engineer | Run `uv run pytest tests/ -v` in `services/notifications/`. Verify all 10 SPEC.md acceptance criteria are met. Confirm architecture tests still pass (application layer has no infrastructure imports). Flag any doc or coverage gaps. Return APPROVED or NEEDS FIXES. | TEST-01 | ⬜ pending |
| DEVOPS-01 | devops-engineer | `terraform/environments/develop/ecs_api/terraform.tfvars`: add `FIREBASE_CREDENTIALS_JSON` and `FIREBASE_PROJECT_ID` to the `"notifications"` service `secrets` block (SSM paths: `/final-project-miso/notifications/firebase_credentials_json` and `/final-project-miso/notifications/firebase_project_id`); add `FCM_TOKENS_SSM_PATH` to `environment_variables`. Verify the ECS task role IAM policy includes `ssm:GetParameter` on the fcm-tokens path. No new pipeline stages needed — `notifications` is already in the deploy matrix. | RVEW-01 | ⬜ pending |
| DOCS-01 | docs-engineer | (1) `specs/push-notifications-booking-status/SPEC.md`: resolve open questions 1 and 2, set status to Implemented. (2) `CLAUDE.md`: update the `notifications` service description to mention FCM push and the `register_push_token.yml` workflow; update `Service Communication` section to note SSM token registry reads. (3) `services/notifications/README.md`: document new env vars (`FIREBASE_CREDENTIALS_JSON`, `FIREBASE_PROJECT_ID`, `FCM_TOKENS_SSM_PATH`) and the token registration workflow. | RVEW-01 | ⬜ pending |

---

## Acceptance Criteria Traceability

| Criterion | Implemented by | Tested by | Reviewed by |
|---|---|---|---|
| AC-1: All 7 event types trigger a push notification to all registered FCM tokens for the user_id | IMPL-01 | TEST-01 | RVEW-01 |
| AC-2: Push sent via `firebase-admin` SDK with service account credential | IMPL-01 | TEST-01 | RVEW-01 |
| AC-3: No FCM token registered → push silently skipped, email still sends | IMPL-01 | TEST-01 | RVEW-01 |
| AC-4: Push send failure → logged as warning, SQS message still acked | IMPL-01 | TEST-01 | RVEW-01 |
| AC-5: `register_push_token.yml` workflow upserts token in SSM correctly | IMPL-02 | — (manual / devops) | RVEW-01 |
| AC-6: SSM parameter shape `{ "user_id": ["token1", ...] }` read fresh per message | IMPL-01 | TEST-01 | RVEW-01 |
| AC-7: New config vars present in `Settings` and ECS tfvars | IMPL-01 | TEST-01 | DEVOPS-01 |
| AC-8: Architecture tests still pass (application layer clean) | IMPL-01 | TEST-01 | RVEW-01 |
| AC-9: ≥80% coverage on `FcmPushSender` and `SsmTokenRegistry` | — | TEST-01 | RVEW-01 |
| AC-10: Existing SMTP email flow and all existing tests pass | IMPL-01 | TEST-01 | RVEW-01 |

---

## Notes

- IMPL-01 and IMPL-02 are independent and can be given to the same agent sequentially in one pass.
- The GitHub Actions workflow (IMPL-02) cannot be integration-tested without real AWS credentials; RVEW-01 validates it by code review only.
- `firebase-admin` should be mocked entirely in tests using `unittest.mock.patch` — do not call real Firebase in unit tests.
- The `_NoOpPushSender` defined inline in `bootstrap.py` does not need its own test file; coverage comes from the bootstrap test asserting it is used when credentials are empty.
- devops-engineer and docs-engineer run in parallel after RVEW-01 returns APPROVED.
