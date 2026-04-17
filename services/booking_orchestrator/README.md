# Booking Orchestrator Microservice

Saga coordinator for the booking lifecycle. Fronts the frontend with synchronous endpoints and fans out to `booking`, `poc_properties`, `stripe-mock`, and the `notifications` / `billing` SQS queues. Built with FastAPI and hexagonal architecture, targeting a < 3s end-to-end SLA.

## Base URL

**Production:** `https://{api-gateway-url}/booking-orchestrator`

## Endpoints

### Health Check

```
GET /api/health
```

### Create Reservation

```
POST /api/reservations
```

Creates a booking in `PENDING` status, locks the property for the requested period, and enqueues a `BOOKING_CREATED` notification for asynchronous email delivery.

**Headers**

| Header        | Value            | Required | Source                                     |
|---------------|------------------|----------|--------------------------------------------|
| Content-Type  | application/json | Yes      |                                            |
| Authorization | Bearer `<JWT>`   | Yes      | Cognito id token                           |
| X-User-Id     | `<user UUID>`    | Yes      | Injected by API Gateway from JWT `sub`     |
| X-User-Email  | `<email>`        | Yes      | Injected by API Gateway from JWT `email`   |

In production `X-User-Id` / `X-User-Email` are injected automatically by the API Gateway authorizer — do **not** send them manually from the frontend.

**Request Body**

| Field          | Type    | Required | Description                              |
|----------------|---------|----------|------------------------------------------|
| property_id    | string  | Yes      | ID of the property to book               |
| guests         | integer | Yes      | Number of guests (≥ 1)                   |
| period_start   | date    | Yes      | Check-in  (`YYYY-MM-DD`)                 |
| period_end     | date    | Yes      | Check-out (`YYYY-MM-DD`)                 |
| price          | decimal | Yes      | Total booking price                      |
| admin_group_id | string  | Yes      | Admin group responsible for the booking  |

**Responses**

| Status | Meaning                                                                 |
|--------|-------------------------------------------------------------------------|
| 201    | Booking created in `PENDING`. Body is the full booking payload.         |
| 409    | Property could not be locked (`property_unavailable`) — booking was compensated (cancelled). |
| 502    | Upstream failure calling the booking service.                           |
| 422    | Missing headers or invalid request body.                                |

## Saga

```
1. POST booking /api/booking/           → PENDING booking created
2. POST poc_properties /api/property/lock
     │
     └── on failure ──▶ POST booking /api/booking/{id}/cancel  (compensation)
                                         ├── returns 201 compensated → raise 409
                                         └── returns error          → log, still 409
3. SQS SendMessage → notifications_queue  (best-effort; log on failure)
4. return 201 with booking payload
```

The saga creates the booking **before** locking the property so that there is always an entity to cancel on failure (poc_properties has no `unlock` endpoint).

### Admin Approve Reservation

```
POST /api/reservations/{booking_id}/admin-approve
```

Approves a `PENDING` booking (PENDING → APPROVED) and enqueues a `BOOKING_APPROVED` notification.

**Headers**

| Header        | Value            | Required |
|---------------|------------------|----------|
| Content-Type  | application/json | Yes      |
| Authorization | Bearer `<JWT>`   | Yes      |
| X-User-Id     | `<admin UUID>`   | Yes      |

**Request Body**

| Field          | Type   | Required | Description           |
|----------------|--------|----------|-----------------------|
| traveler_email | string | Yes      | Traveler's email      |

**Responses**

| Status | Meaning                                           |
|--------|---------------------------------------------------|
| 200    | Booking approved. Body is the updated booking.    |
| 404    | Booking not found.                                |
| 409    | Booking is not in `PENDING` status.               |

---

### Make Payment

```
POST /api/reservations/{booking_id}/make-payment
```

Processes payment for a booking via Stripe, confirms it, records a billing entry, and sends a payment confirmation notification. The booking does not need to be in `APPROVED` status — payment can proceed from any non-terminal state (e.g., directly from `PENDING`).

**Saga steps:**
1. Fetch booking
2. Stripe create payment → get `referencePaymentId`
3. Stripe confirm payment
4. Update booking payment state (→ CONFIRMED)
5. Publish billing CREATE to `billing_queue` (best-effort)
6. Publish `PAYMENT_CONFIRMED` to `notifications_queue` (best-effort)

**Compensation:** If Stripe confirm or booking update fails, the Stripe payment is cancelled.

**Headers**

| Header        | Value            | Required |
|---------------|------------------|----------|
| Content-Type  | application/json | Yes      |
| Authorization | Bearer `<JWT>`   | Yes      |
| X-User-Id     | `<user UUID>`    | Yes      |
| X-User-Email  | `<email>`        | Yes      |

**Request Body**

| Field              | Type   | Required | Default       | Description         |
|--------------------|--------|----------|---------------|---------------------|
| currency           | string | No       | `USD`         | 3-letter currency   |
| payment_method_type| string | No       | `CREDIT_CARD` | Payment method type |

**Responses**

| Status | Meaning                                                                    |
|--------|----------------------------------------------------------------------------|
| 200    | Payment processed, booking is `CONFIRMED`. Body is the updated booking.   |
| 404    | Booking not found.                                                         |
| 409    | Stripe or booking update failed (with compensation).                       |

---

### Cancel Reservation

```
POST /api/reservations/{booking_id}/cancel
```

Cancels a booking in `PENDING`, `APPROVED`, or `CONFIRMED` status and enqueues a `BOOKING_CANCELLED` notification.

**Headers**

| Header        | Value            | Required |
|---------------|------------------|----------|
| Authorization | Bearer `<JWT>`   | Yes      |
| X-User-Id     | `<user UUID>`    | Yes      |
| X-User-Email  | `<email>`        | Yes      |

**Responses**

| Status | Meaning                                                          |
|--------|------------------------------------------------------------------|
| 200    | Booking cancelled. Body: `{"booking_id": "...", "status": "CANCELED"}` |
| 404    | Booking not found.                                               |
| 409    | Booking is not in a cancellable state.                           |

---

## Notification schemas (v1)

The orchestrator publishes JSON messages onto `notifications_queue`:

**BOOKING_CREATED** — on successful reservation:
```json
{
  "schema_version": 1,
  "type": "BOOKING_CREATED",
  "occurred_at": "2026-04-08T12:34:56Z",
  "booking": { "id": "...", "property_id": "...", "period_start": "2026-06-01", "period_end": "2026-06-05", "guests": 2, "price": "250.00", "status": "PENDING" },
  "recipient": { "user_id": "...", "email": "traveler@example.com" }
}
```

**PAYMENT_CONFIRMED** — after successful payment:
```json
{
  "schema_version": 1,
  "type": "PAYMENT_CONFIRMED",
  "occurred_at": "2026-04-08T12:35:00Z",
  "booking": { "id": "...", "property_id": "...", "period_start": "2026-06-01", "period_end": "2026-06-05", "guests": 2, "price": "250.00", "payment_reference": "stripe-ref-abc123" },
  "recipient": { "user_id": "...", "email": "traveler@example.com" }
}
```

Other event types: `BOOKING_APPROVED`, `BOOKING_CONFIRMED`, `BOOKING_REJECTED`, `BOOKING_CANCELLED`, `BOOKING_DATES_CHANGED`.

## Billing schema

On successful payment, the orchestrator publishes a billing command onto `billing_queue`:

```json
{
  "operation": "CREATE",
  "payload": {
    "bookingId": "...",
    "paymentReference": "stripe-ref-abc123",
    "paymentDate": "2026-04-08T12:35:00Z",
    "adminGroupId": "...",
    "value": "250.00"
  }
}
```

## Environment variables

| Variable                 | Description                                          | Default                  |
|--------------------------|------------------------------------------------------|--------------------------|
| BOOKING_SERVICE_URL      | Base URL of the booking microservice                 | `http://localhost:8001`  |
| PROPERTIES_SERVICE_URL   | Base URL of poc_properties                           | `http://localhost:8002`  |
| STRIPE_MOCK_SERVICE_URL  | Base URL of the Stripe mock service                  | `http://localhost:8003`  |
| UPSTREAM_HTTP_TIMEOUT    | httpx timeout (seconds) for outbound calls           | `2.0`                    |
| STRIPE_HTTP_TIMEOUT      | httpx timeout (seconds) for Stripe calls             | `2.5`                    |
| AWS_REGION               | AWS region for SQS                                   | `us-east-1`              |
| NOTIFICATIONS_QUEUE_URL  | URL of the notifications SQS queue                   | *(required in prod)*     |
| BILLING_QUEUE_URL        | URL of the billing SQS queue                         | *(required in prod)*     |

In `ecs_api` the URLs come from SSM parameters via the existing `secrets` wiring; no hardcoded values.

## Local development

```bash
cd services/booking_orchestrator
uv sync --group dev
uv run uvicorn main:app --reload --port 8100
```

## Running tests

```bash
uv run pytest tests/ -v
# or from repo root
make unittest-uv DIR=services/booking_orchestrator
```

Coverage gate: 80 %.

## Architecture

```
src/booking_orchestrator/
├── domain/
│   ├── events.py              # BookingCreatedEvent, BookingApprovedEvent, BookingCancelledEvent, PaymentConfirmedEvent, etc.
│   └── exceptions.py
├── application/
│   ├── commands.py
│   ├── ports.py               # BookingClient / PropertyClient / StripeClient / BillingPublisher / NotificationPublisher
│   ├── create_reservation.py
│   ├── admin_approve_reservation.py
│   ├── admin_confirm_reservation.py
│   ├── admin_reject_reservation.py
│   ├── cancel_reservation.py
│   ├── change_dates_reservation.py
│   └── make_payment.py        # payment saga (Stripe + billing + booking update)
├── infrastructure/
│   ├── httpx_booking_client.py
│   ├── httpx_property_client.py
│   ├── httpx_stripe_client.py
│   ├── sqs_notification_publisher.py
│   └── sqs_billing_publisher.py
├── controllers.py
├── schemas.py
├── bootstrap.py               # DI wiring
├── config.py
└── main.py                    # create_app() + lifespan
```

Domain has no FastAPI / httpx / boto3 imports. Application depends only on domain. Infrastructure depends on everything. Enforced by tests in `tests/conftest.py`.
