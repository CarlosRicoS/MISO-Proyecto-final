# Check-In Service

Manages digital check-in for hotel reservations. When a traveler arrives at a QR-enabled hotel, this service validates the hotel's QR token against the traveler's booking, verifies ownership and CONFIRMED status, records the check-in event, and calls the booking service to transition the reservation to COMPLETED.

## Stack

- Python 3.13 / FastAPI
- Async SQLAlchemy (asyncpg driver) — PostgreSQL
- httpx for outbound calls to the booking service
- Hexagonal (ports & adapters) architecture
- `uv` for dependency management

## Architecture

```
controllers.py          — FastAPI HTTP adapter (3 routes)
bootstrap.py            — Dependency-injection factories
schemas.py              — Pydantic request/response models
config.py               — Settings (env vars + defaults)
database.py             — Async engine, Base, get_session

domain/
  value_objects.py      — CheckingAvailable, CheckInRecord (frozen dataclasses)
  exceptions.py         — Domain exception types

application/
  commands.py           — RegisterPropertyCommand, CheckAvailabilityQuery, PerformCheckInCommand
  ports.py              — CheckInRepository (Protocol), BookingClient (Protocol)
  register_property.py  — RegisterPropertyUseCase
  check_availability.py — CheckAvailabilityUseCase
  perform_checkin.py    — PerformCheckInUseCase

infrastructure/
  models.py                  — CheckingAvailableModel, CheckingModel (SQLAlchemy ORM)
  sqlalchemy_checkin_repo.py — CheckInRepository adapter
  httpx_booking_client.py    — BookingClient adapter (GET + POST to booking service)
```

Tables are created via `Base.metadata.create_all` on startup (no Alembic migration needed — greenfield service).

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/check-in/available` | Public (POC) | Register a property for digital check-in. Generates and returns a `qr_token`. Returns `409` if the property is already registered. |
| `GET` | `/api/check-in/available` | JWT (`X-User-Id`) | Check whether a property has digital check-in enabled. Query param: `property_id` (UUID). |
| `POST` | `/api/check-in` | JWT (`X-User-Id`) | Perform digital check-in. Validates QR token, verifies booking ownership and CONFIRMED status, records check-in, and transitions booking to COMPLETED. |

## Environment Variables

| Variable | Source | Description |
|---|---|---|
| `DB_USERNAME` | SSM `/final-project-miso/checkin/db_username` | PostgreSQL username |
| `DB_PASSWORD` | SSM `/final-project-miso/checkin/db_password` | PostgreSQL password |
| `DB_HOST` | SSM `/final-project-miso/checkin/db_host` | PostgreSQL host |
| `DB_PORT` | env / default `5432` | PostgreSQL port |
| `DB_NAME` | SSM `/final-project-miso/checkin/db_name` | PostgreSQL database name |
| `BOOKING_SERVICE_URL` | SSM `/final-project-miso/booking/service_url` | Internal VPC URL of the booking service |
| `UPSTREAM_HTTP_TIMEOUT` | env / default `5.0` | Timeout in seconds for outbound httpx calls to booking service |

## Running locally

```bash
uv sync --group dev
uv run pytest tests/ -v
uv run uvicorn main:app --reload --port 8000
```

Requires a running PostgreSQL instance and the booking service reachable at `BOOKING_SERVICE_URL`.
