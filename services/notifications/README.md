# Notifications Microservice

Consumes `notifications_queue` and sends transactional emails via the AWS SES SMTP relay and FCM push notifications to Android devices via the `firebase-admin` SDK. Not called by the frontend, requires no auth, and holds no database. Built with FastAPI + a lifespan-managed background SQS consumer task.

## Endpoints

```
GET /api/health
```

The only HTTP endpoint is the health check — the real work happens in a background task.

## Message contract (v1)

Messages on `notifications_queue` are JSON with a versioned envelope:

```json
{
  "schema_version": 1,
  "type": "BOOKING_CREATED",
  "occurred_at": "2026-04-08T12:34:56Z",
  "booking": { "id": "...", "property_id": "...", "period_start": "...", "period_end": "...", "guests": 2, "price": "250.00", "status": "PENDING" },
  "recipient": { "user_id": "...", "email": "traveler@example.com" }
}
```

**Routing**: `MessageDispatcher` matches on `(schema_version, type)` pairs. Supported types:

| Type                    | Handler                     | Email subject                                |
|-------------------------|-----------------------------|----------------------------------------------|
| `BOOKING_CREATED`       | `HandleBookingCreated`      | Tu reserva {id} fue creada                   |
| `BOOKING_APPROVED`      | `HandleBookingApproved`     | Tu reserva {id} fue aprobada                 |
| `BOOKING_CANCELLED`     | `HandleBookingCancelled`    | Tu reserva {id} fue cancelada (includes refund/penalty amounts) |
| `BOOKING_CONFIRMED`     | `HandleBookingConfirmed`    | Tu reserva {id} fue confirmada               |
| `BOOKING_REJECTED`      | `HandleBookingRejected`     | Tu reserva {id} fue rechazada                |
| `BOOKING_DATES_CHANGED` | `HandleBookingDatesChanged` | Tu reserva {id} fue modificada               |
| `PAYMENT_CONFIRMED`     | `HandlePaymentConfirmed`    | Pago confirmado para tu reserva {id}         |

Unknown types or schema versions cause the consumer to **not** delete the message — SQS will retry, and after `max_receive_count` attempts the message is redriven to `notifications_dlq`. This keeps poison messages visible to operators instead of silently dropped.

**Delete semantics**:

| Outcome                        | Delete from queue? |
|--------------------------------|-------------------|
| Handler success                | Yes (ack)         |
| Unsupported schema/type        | No → DLQ          |
| Handler raises unexpected error| No → DLQ          |
| Message body not JSON          | No → DLQ          |

## Environment variables

| Variable                | Description                                 | Default                     |
|-------------------------|---------------------------------------------|-----------------------------|
| AWS_REGION              | AWS region for SQS                          | `us-east-1`                 |
| NOTIFICATIONS_QUEUE_URL | URL of the main notifications queue         | *(required in prod)*        |
| SQS_WAIT_TIME_SECONDS   | Long-poll wait on ReceiveMessage            | `20`                        |
| SQS_MAX_MESSAGES        | Max messages per batch                      | `10`                        |
| CONSUMER_ENABLED        | Set to `false` to run HTTP-only (for tests) | `true`                      |
| SMTP_HOST               | SMTP server host (SES SMTP endpoint in prod)| `localhost`                 |
| SMTP_PORT               | SMTP server port                            | `587`                       |
| SMTP_USERNAME           | SMTP auth username (SES IAM SMTP cred)      | `""`                        |
| SMTP_PASSWORD           | SMTP auth password (SES IAM SMTP cred)      | `""`                        |
| SMTP_USE_TLS            | Issue STARTTLS after connect                | `true`                      |
| SMTP_FROM               | `From:` header for outgoing emails          | `no-reply@travelhub.local`  |
| FIREBASE_CREDENTIALS_JSON | Firebase service account JSON string. If empty, push is disabled (no-op). | `""` |
| FIREBASE_PROJECT_ID     | Firebase project ID. Required when `FIREBASE_CREDENTIALS_JSON` is set. | `""` |
| FCM_TOKENS_SSM_PATH     | SSM parameter path for the FCM device token registry. | `/final-project-miso/notifications/fcm-tokens` |

The SMTP credentials are not managed by terraform — seed them manually once in SSM under `/final-project-miso/notifications/smtp_*` before the first `ecs_api` deploy.

The Firebase credentials (`FIREBASE_CREDENTIALS_JSON`, `FIREBASE_PROJECT_ID`) are injected from SSM secrets in the ECS task definition. If either is absent the service starts normally with push silently disabled — email delivery is unaffected.

## Token registration

FCM device tokens are registered via the `register_push_token.yml` GitHub Actions `workflow_dispatch` workflow. Trigger it from the Actions tab with:

| Input | Description |
|---|---|
| `user_id` | Cognito `sub` claim — the user's unique identifier |
| `fcm_token` | FCM registration token obtained from the Android device (via `@capacitor/push-notifications`) |
| `environment` | Target environment (e.g., `develop`) |

The workflow reads the current value of the SSM parameter at `FCM_TOKENS_SSM_PATH`, upserts the token into the array for that `user_id` (deduplicating via `jq unique`), and writes the updated JSON back with `--overwrite`. The parameter is created automatically on first run.

**SSM parameter shape:**
```json
{
  "cognito-user-sub-uuid": ["fcm-token-a", "fcm-token-b"],
  "another-user-sub-uuid": ["fcm-token-c"]
}
```

Note: SSM standard parameters hold up to 4 KB. This is sufficient for small user bases; switch to an advanced parameter (8 KB) or DynamoDB if the registry grows.

## Local development

```bash
cd services/notifications
uv sync --group dev

# HTTP-only mode (no real SQS / SMTP):
CONSUMER_ENABLED=false uv run uvicorn main:app --reload --port 8200
```

To exercise the consumer locally, point `NOTIFICATIONS_QUEUE_URL` at a dev queue and run a local SMTP sink such as [`aiosmtpd`](https://pypi.org/project/aiosmtpd/).

## Running tests

```bash
uv run pytest tests/ -v
# or from repo root
make unittest-uv DIR=services/notifications
```

Tests use `moto` (in-memory SQS) and a mocked `smtplib.SMTP` — no AWS or network required. Coverage gate: 80 %.

## Architecture

```
src/notifications/
├── domain/
│   ├── events.py          # BookingCreatedEvent, PaymentConfirmedEvent, etc.
│   └── exceptions.py
├── application/
│   ├── ports.py           # EmailSender and PushSender protocols
│   ├── handle_booking_created.py
│   ├── handle_booking_approved.py
│   ├── handle_booking_cancelled.py
│   ├── handle_booking_confirmed.py
│   ├── handle_booking_rejected.py
│   ├── handle_booking_dates_changed.py
│   └── handle_payment_confirmed.py
├── infrastructure/
│   ├── sqs_consumer.py       # async long-polling loop
│   ├── smtp_email_sender.py  # EmailSender adapter (smtplib + SES)
│   ├── fcm_push_sender.py    # PushSender adapter (firebase-admin SDK)
│   ├── ssm_token_registry.py # reads FCM tokens from SSM per-message
│   └── dispatcher.py         # routes by (schema_version, type)
├── bootstrap.py               # wires SmtpEmailSender + FcmPushSender/_NoOpPushSender
├── config.py
└── main.py                    # FastAPI + lifespan-managed consumer
```

Each of the 7 `handle_*.py` handlers accepts both an `EmailSender` and a `PushSender`. The push call is wrapped in `try/except` so failures are logged as warnings without preventing the SQS ack. If `FIREBASE_CREDENTIALS_JSON` is empty, `bootstrap.py` wires a `_NoOpPushSender` instead of `FcmPushSender`, so the service starts cleanly in environments without Firebase credentials.
