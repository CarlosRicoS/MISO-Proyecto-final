# Booking Microservice

Booking management service for TravelHub, built with FastAPI and hexagonal (ports & adapters) architecture.

## Base URL

**Production:** `https://{api-gateway-url}/booking`

## Endpoints

### Health Check

```
GET /api/health
```

**Response** `200 OK`
```json
{
  "status": "healthy"
}
```

---

### Create Booking

```
POST /api/booking/
```

Creates a new booking with status `PENDING`.

**Headers**

| Header       | Value            | Required |
|--------------|------------------|----------|
| Content-Type | application/json | Yes      |
| X-User-Id    | `<user UUID>`    | Yes      |

**Request Body**

| Field          | Type    | Required | Description                            |
|----------------|---------|----------|----------------------------------------|
| property_id    | UUID    | Yes      | ID of the property to book             |
| guests         | integer | Yes      | Number of guests (minimum 1)           |
| period_start   | date    | Yes      | Check-in date (`YYYY-MM-DD`)           |
| period_end     | date    | Yes      | Check-out date (`YYYY-MM-DD`)          |
| price          | decimal | Yes      | Total booking price (must be >= 0)     |
| admin_group_id | UUID    | Yes      | Admin group responsible for this booking |

#### Example

**Request**
```bash
curl -X POST https://{api-gateway-url}/booking/api/booking/ \
  -H 'Content-Type: application/json' \
  -H 'X-User-Id: 550e8400-e29b-41d4-a716-446655440000' \
  -d '{
    "property_id": "660e8400-e29b-41d4-a716-446655440000",
    "guests": 2,
    "period_start": "2026-06-01",
    "period_end": "2026-06-05",
    "price": 250.00,
    "admin_group_id": "770e8400-e29b-41d4-a716-446655440000"
  }'
```

**Response** `201 Created`
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "property_id": "660e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "guests": 2,
  "period_start": "2026-06-01",
  "period_end": "2026-06-05",
  "price": 250.00,
  "status": "PENDING",
  "admin_group_id": "770e8400-e29b-41d4-a716-446655440000",
  "payment_reference": null,
  "created_at": "2026-03-27T12:00:00Z"
}
```

---

### Get Booking

```
GET /api/booking/{booking_id}
```

Retrieves a single booking by ID.

**Path Parameters**

| Parameter  | Type | Description         |
|------------|------|---------------------|
| booking_id | UUID | ID of the booking   |

#### Example

**Request**
```bash
curl https://{api-gateway-url}/booking/api/booking/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Response** `200 OK`
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "property_id": "660e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "guests": 2,
  "period_start": "2026-06-01",
  "period_end": "2026-06-05",
  "price": 250.00,
  "status": "PENDING",
  "admin_group_id": "770e8400-e29b-41d4-a716-446655440000",
  "payment_reference": null,
  "created_at": "2026-03-27T12:00:00Z"
}
```

---

### List User Bookings

```
GET /api/booking/
```

Returns all bookings for the authenticated user, ordered by creation date (newest first).

**Headers**

| Header    | Value         | Required |
|-----------|---------------|----------|
| X-User-Id | `<user UUID>` | Yes      |

#### Example

**Request**
```bash
curl https://{api-gateway-url}/booking/api/booking/ \
  -H 'X-User-Id: 550e8400-e29b-41d4-a716-446655440000'
```

**Response** `200 OK`
```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "property_id": "660e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "guests": 2,
    "period_start": "2026-06-01",
    "period_end": "2026-06-05",
    "price": 250.00,
    "status": "PENDING",
    "admin_group_id": "770e8400-e29b-41d4-a716-446655440000",
    "payment_reference": null,
    "created_at": "2026-03-27T12:00:00Z"
  }
]
```

Returns an empty array `[]` if the user has no bookings.

---

### Change Booking Dates

```
PATCH /api/booking/{booking_id}/dates
```

Changes the dates and price of an existing booking. **Only `CONFIRMED` bookings can have their dates changed.**

The response includes a `price_difference` field (new price − original price) so the caller can display the cost delta before the traveler confirms the change.

**Availability checking** (AC2) is the responsibility of the calling layer (e.g., the booking-orchestrator verifying against the property service). **Hotel notification** (AC3) is handled by the booking-orchestrator, which should publish a `BOOKING_DATES_CHANGED` event upon receiving a successful response from this endpoint.

**Path Parameters**

| Parameter  | Type | Description               |
|------------|------|---------------------------|
| booking_id | UUID | ID of the booking to update |

**Headers**

| Header       | Value            | Required |
|--------------|------------------|----------|
| Content-Type | application/json | Yes      |
| X-User-Id    | `<user UUID>`    | Yes      |

**Request Body**

| Field            | Type    | Required | Description                                     |
|------------------|---------|----------|-------------------------------------------------|
| new_period_start | date    | Yes      | New check-in date (`YYYY-MM-DD`)                |
| new_period_end   | date    | Yes      | New check-out date (`YYYY-MM-DD`)               |
| new_price        | decimal | Yes      | New total price (must be >= 0)                  |

#### Example

**Request**
```bash
curl -X PATCH https://{api-gateway-url}/booking/api/booking/a1b2c3d4-e5f6-7890-abcd-ef1234567890/dates \
  -H 'Content-Type: application/json' \
  -H 'X-User-Id: 550e8400-e29b-41d4-a716-446655440000' \
  -d '{
    "new_period_start": "2026-07-01",
    "new_period_end": "2026-07-05",
    "new_price": 320.00
  }'
```

**Response** `200 OK`
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "property_id": "660e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "guests": 2,
  "period_start": "2026-07-01",
  "period_end": "2026-07-05",
  "price": 320.00,
  "status": "CONFIRMED",
  "admin_group_id": "770e8400-e29b-41d4-a716-446655440000",
  "payment_reference": "PAY-123",
  "created_at": "2026-03-27T12:00:00Z",
  "price_difference": 70.00
}
```

A **negative** `price_difference` means the new dates are cheaper than the original booking.

---

### Admin Approve Booking

```
POST /api/booking/{booking_id}/admin-approve
```

Approves a `PENDING` booking, transitioning it to `APPROVED`. This is the first step before the traveler can make a payment. No request body required.

**Path Parameters**

| Parameter  | Type | Description               |
|------------|------|---------------------------|
| booking_id | UUID | ID of the booking to approve |

#### Example

**Request**
```bash
curl -X POST https://{api-gateway-url}/booking/api/booking/a1b2c3d4-e5f6-7890-abcd-ef1234567890/admin-approve
```

**Response** `200 OK`
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "property_id": "660e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "guests": 2,
  "period_start": "2026-06-01",
  "period_end": "2026-06-05",
  "price": 250.00,
  "status": "APPROVED",
  "admin_group_id": "770e8400-e29b-41d4-a716-446655440000",
  "payment_reference": null,
  "created_at": "2026-03-27T12:00:00Z"
}
```

---

### Update Payment State

```
POST /api/booking/{booking_id}/update-payment-state
```

Confirms an `APPROVED` booking with a real payment reference (e.g., from Stripe), transitioning it to `CONFIRMED`.

**Path Parameters**

| Parameter  | Type | Description               |
|------------|------|---------------------------|
| booking_id | UUID | ID of the booking to confirm |

**Headers**

| Header       | Value            | Required |
|--------------|------------------|----------|
| Content-Type | application/json | Yes      |

**Request Body**

| Field             | Type   | Required | Description                                |
|-------------------|--------|----------|--------------------------------------------|
| payment_reference | string | Yes      | Payment reference from the payment gateway (1–200 chars) |

#### Example

**Request**
```bash
curl -X POST https://{api-gateway-url}/booking/api/booking/a1b2c3d4-e5f6-7890-abcd-ef1234567890/update-payment-state \
  -H 'Content-Type: application/json' \
  -d '{"payment_reference": "stripe-ref-abc123"}'
```

**Response** `200 OK`
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "property_id": "660e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "guests": 2,
  "period_start": "2026-06-01",
  "period_end": "2026-06-05",
  "price": 250.00,
  "status": "CONFIRMED",
  "admin_group_id": "770e8400-e29b-41d4-a716-446655440000",
  "payment_reference": "stripe-ref-abc123",
  "created_at": "2026-03-27T12:00:00Z"
}
```

---

### Cancel Booking

```
POST /api/booking/{booking_id}/cancel
```

Cancels an existing booking. Only bookings in `PENDING`, `APPROVED`, or `CONFIRMED` status can be cancelled.

**Path Parameters**

| Parameter  | Type | Description              |
|------------|------|--------------------------|
| booking_id | UUID | ID of the booking to cancel |

**Headers**

| Header    | Value         | Required |
|-----------|---------------|----------|
| X-User-Id | `<user UUID>` | Yes      |

#### Example

**Request**
```bash
curl -X POST https://{api-gateway-url}/booking/api/booking/a1b2c3d4-e5f6-7890-abcd-ef1234567890/cancel \
  -H 'X-User-Id: 550e8400-e29b-41d4-a716-446655440000'
```

**Response** `200 OK`
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "property_id": "660e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "guests": 2,
  "period_start": "2026-06-01",
  "period_end": "2026-06-05",
  "price": 250.00,
  "status": "CANCELED",
  "admin_group_id": "770e8400-e29b-41d4-a716-446655440000",
  "payment_reference": null,
  "created_at": "2026-03-27T12:00:00Z"
}
```

---

### Error Responses

| Status | Condition                                    | Example Response                                              |
|--------|----------------------------------------------|---------------------------------------------------------------|
| 404    | Booking ID not found                         | `{"detail": "Booking not found"}`                             |
| 409    | Booking is already cancelled                 | `{"detail": "Booking is already cancelled"}`                  |
| 409    | Invalid status transition (e.g., cancel a completed booking) | `{"detail": "Cannot transition from COMPLETED to CANCELED"}` |
| 409    | Attempt to change dates on a non-CONFIRMED booking | `{"detail": "Booking <id> cannot have its dates changed in status PENDING. Only CONFIRMED bookings allow date changes."}` |
| 422    | Invalid period (start date >= end date)      | `{"detail": "period_start must be before period_end"}`        |
| 422    | Guests < 1, price < 0, or missing fields     | `{"detail": [{"msg": "...", "loc": [...]}]}`                  |
| 422    | Missing `X-User-Id` header                   | `{"detail": [{"msg": "Field required", "loc": ["header", "x-user-id"]}]}` |

---

## Booking Status State Machine

Bookings follow a strict state machine. Only the transitions shown below are valid:

```
PENDING ──→ APPROVED ──→ CONFIRMED ──→ COMPLETED
   │    ╲        │             │
   │     ╲───────┼─────────────┤
   │             │             │
   └─────────────┴─────────────┴──→ CANCELED
```

> `PENDING` can transition directly to `CONFIRMED` (payment without prior admin approval).

| Status      | Description                                      | Can transition to                    |
|-------------|--------------------------------------------------|--------------------------------------|
| `PENDING`   | Initial status after creation                    | `APPROVED`, `CONFIRMED`, `CANCELED`, `REJECTED` |
| `APPROVED`  | Booking approved by admin                        | `CONFIRMED`, `CANCELED`              |
| `CONFIRMED` | Payment received                                 | `COMPLETED`, `CANCELED`              |
| `COMPLETED` | Stay period finished                             | _(terminal — no transitions)_        |
| `CANCELED`  | Booking cancelled                                | _(terminal — no transitions)_        |
| `REJECTED`  | Booking rejected by admin                        | _(terminal — no transitions)_        |

Only `PENDING`, `APPROVED`, and `CONFIRMED` bookings can be cancelled via the API.

---

## Authentication & Authorization

The API Gateway injects user identity headers from the validated JWT:

| Header       | Source                   | Description               |
|--------------|--------------------------|---------------------------|
| X-User-Id    | `sub` claim from JWT     | Cognito user UUID         |
| X-User-Email | `email` claim from JWT   | User's email address      |

All booking endpoints require a valid JWT passed as `Authorization: Bearer <id_token>` to the API Gateway. The `X-User-Id` header is then injected automatically by the gateway — do **not** pass it manually in production.

---

## Local Development

```bash
# Install dependencies
uv sync --group dev

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your database credentials

# Start a local PostgreSQL instance (Docker recommended)
docker run -d \
  --name booking-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=booking \
  -p 5432:5432 \
  postgres:16

# Run the server
uv run uvicorn main:app --reload --port 8000

# Interactive API docs available at:
# http://localhost:8000/docs
```

### Environment Variables

| Variable       | Description                                      | Default                                                   |
|----------------|--------------------------------------------------|-----------------------------------------------------------|
| DATABASE_URL   | Full async database URL                          | `postgresql+asyncpg://postgres:postgres@localhost:5432/booking` |
| DATABASE_ECHO  | Log all SQL statements                           | `false`                                                   |
| DEBUG          | Enable debug mode                                | `false`                                                   |
| DB_POOL_SIZE   | Number of persistent connections in pool         | `10`                                                      |
| DB_MAX_OVERFLOW| Extra burst connections beyond pool size         | `20`                                                      |
| DB_POOL_RECYCLE| Seconds before recycling a connection            | `3600`                                                    |
| DB_POOL_TIMEOUT| Seconds to wait for a free connection            | `30`                                                      |

> **Note:** `DATABASE_URL` takes precedence. If not set, the service builds the URL from individual `DB_*` variables.

---

## Running Tests

```bash
# Run all tests with coverage report
uv run pytest tests/ -v

# Run a specific test file
uv run pytest tests/integration/test_controllers.py -v

# Run with coverage enforcement (80% minimum, as required by CI)
uv run pytest --cov=booking --cov-fail-under=80
```

Or via Makefile from the repo root:
```bash
make unittest-uv DIR=services/booking
```

**Test structure:**

| Directory              | What it tests                                      |
|------------------------|----------------------------------------------------|
| `tests/domain/`        | Booking aggregate, value objects, status transitions |
| `tests/application/`   | Use cases with in-memory repository                |
| `tests/integration/`   | HTTP endpoint tests + architecture layer rules     |

Tests use an `InMemoryBookingRepository` — no database required for unit or use case tests.

---

## Architecture

The service follows **hexagonal (ports & adapters)** architecture:

```
src/booking/
├── domain/              # Core business rules — no external dependencies
│   ├── booking.py       # Booking aggregate root + BookingStatus enum
│   ├── value_objects.py # BookingPeriod, Money
│   └── exceptions.py    # Domain errors
├── application/         # Use cases — depends only on domain
│   ├── commands.py      # CreateBookingCommand, CancelBookingCommand, ChangeDatesCommand, etc.
│   ├── ports.py         # BookingRepository protocol (interface)
│   ├── create_booking.py
│   ├── get_booking.py
│   ├── cancel_booking.py
│   ├── change_dates.py
│   ├── admin_approve_booking.py
│   ├── admin_confirm_booking.py
│   ├── admin_reject_booking.py
│   └── update_payment_state.py
├── infrastructure/      # Adapters — implements domain ports
│   ├── models.py        # SQLAlchemy ORM model
│   ├── sqlalchemy_booking_repo.py
│   └── in_memory_booking_repo.py
├── controllers.py       # FastAPI router (HTTP adapter)
├── schemas.py           # Pydantic request/response models
├── bootstrap.py         # Dependency injection wiring
├── database.py          # Async SQLAlchemy engine & session
└── config.py            # Settings loaded from environment
```

### Cross-service responsibilities

| Concern | Owner |
|---------|-------|
| Date change enforcement (CONFIRMED-only rule) | This service (`booking`) |
| Price recalculation / preview (`price_difference`) | This service — returned in response |
| Property availability check before changing dates | Calling layer (booking-orchestrator → property service) |
| Hotel notification on date change | Calling layer (booking-orchestrator publishes event to SQS) |

**Key rules enforced by tests:**
- The `domain` layer must not import from `application` or `infrastructure`
- The `application` layer must not import from `infrastructure`