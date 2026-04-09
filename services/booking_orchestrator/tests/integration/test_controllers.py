"""End-to-end FastAPI test with the use case wired to in-memory fakes.

Uses dependency_overrides to swap the bootstrap'd httpx/boto3 adapters
for the FakeBookingClient/FakePropertyClient/FakePublisher used in the
application-layer tests.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from booking_orchestrator.application.create_reservation import CreateReservationUseCase
from booking_orchestrator.bootstrap import get_create_reservation_use_case
from booking_orchestrator.main import create_app

from ..application.fakes import FakeBookingClient, FakePropertyClient, FakePublisher


@pytest.fixture
def fakes():
    return FakeBookingClient(), FakePropertyClient(), FakePublisher()


@pytest.fixture
def app(fakes):
    booking, prop, pub = fakes
    application = create_app()
    application.dependency_overrides[get_create_reservation_use_case] = (
        lambda: CreateReservationUseCase(booking, prop, pub)
    )
    return application


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_health(client):
    response = await client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


async def test_create_reservation_happy_path(client, fakes):
    booking, prop, pub = fakes
    response = await client.post(
        "/api/reservations",
        headers={
            "X-User-Id": "550e8400-e29b-41d4-a716-446655440000",
            "X-User-Email": "traveler@example.com",
        },
        json={
            "property_id": "prop-123",
            "guests": 2,
            "period_start": "2026-06-01",
            "period_end": "2026-06-05",
            "price": "250.00",
            "admin_group_id": "770e8400-e29b-41d4-a716-446655440000",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["id"] == "booking-xyz"
    assert len(booking.created) == 1
    assert len(prop.locked) == 1
    assert len(pub.published) == 1


async def test_create_reservation_returns_409_on_lock_failure(client, app):
    booking = FakeBookingClient()
    prop = FakePropertyClient(fail_lock=True)
    pub = FakePublisher()
    app.dependency_overrides[get_create_reservation_use_case] = (
        lambda: CreateReservationUseCase(booking, prop, pub)
    )

    response = await client.post(
        "/api/reservations",
        headers={
            "X-User-Id": "u",
            "X-User-Email": "u@x.com",
        },
        json={
            "property_id": "prop-x",
            "guests": 1,
            "period_start": "2026-06-01",
            "period_end": "2026-06-02",
            "price": "10.00",
            "admin_group_id": "g",
        },
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "property_unavailable"
    assert booking.cancelled == [("booking-xyz", "u")]


async def test_missing_user_headers_returns_422(client):
    response = await client.post(
        "/api/reservations",
        json={
            "property_id": "prop-x",
            "guests": 1,
            "period_start": "2026-06-01",
            "period_end": "2026-06-02",
            "price": "10.00",
            "admin_group_id": "g",
        },
    )
    assert response.status_code == 422
