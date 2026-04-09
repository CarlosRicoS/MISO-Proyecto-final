# Booking Orchestrator Microservice

Saga coordinator for the "create reservation" user story. Fronts the frontend with a single synchronous endpoint and fans out to `booking`, `poc_properties`, and the `notifications` SQS queue. Built with FastAPI and hexagonal architecture, targeting a < 3s end-to-end SLA.

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

## Notification schema (v1)

The orchestrator publishes one JSON message per successful reservation onto `notifications_queue`:

```json
{
  "schema_version": 1,
  "type": "BOOKING_CREATED",
  "occurred_at": "2026-04-08T12:34:56Z",
  "booking": {
    "id": "...",
    "property_id": "...",
    "period_start": "2026-06-01",
    "period_end": "2026-06-05",
    "guests": 2,
    "price": "250.00",
    "status": "PENDING"
  },
  "recipient": { "user_id": "...", "email": "traveler@example.com" }
}
```

## Environment variables

| Variable                 | Description                                          | Default                  |
|--------------------------|------------------------------------------------------|--------------------------|
| BOOKING_SERVICE_URL      | Base URL of the booking microservice                 | `http://localhost:8001`  |
| PROPERTIES_SERVICE_URL   | Base URL of poc_properties                           | `http://localhost:8002`  |
| UPSTREAM_HTTP_TIMEOUT    | httpx timeout (seconds) for outbound calls           | `2.0`                    |
| AWS_REGION               | AWS region for SQS                                   | `us-east-1`              |
| NOTIFICATIONS_QUEUE_URL  | URL of the notifications SQS queue                   | *(required in prod)*     |

In `ecs_api` the three URLs come from SSM parameters via the existing `secrets` wiring; no hardcoded values.

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
│   ├── events.py              # BookingCreatedEvent (schema v1)
│   └── exceptions.py
├── application/
│   ├── commands.py
│   ├── ports.py               # BookingClient / PropertyClient / NotificationPublisher
│   └── create_reservation.py  # the saga
├── infrastructure/
│   ├── httpx_booking_client.py
│   ├── httpx_property_client.py
│   └── sqs_notification_publisher.py
├── controllers.py
├── schemas.py
├── bootstrap.py               # DI wiring
├── config.py
└── main.py                    # create_app() + lifespan
```

Domain has no FastAPI / httpx / boto3 imports. Application depends only on domain. Infrastructure depends on everything. Enforced by tests in `tests/conftest.py`.
