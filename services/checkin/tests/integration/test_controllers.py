"""Integration tests for checkin service controllers.

Uses FastAPI TestClient with dependency_overrides for the repository
and booking client — no database or real HTTP required.
"""

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from checkin.bootstrap import get_booking_client, get_checkin_repository
from checkin.domain.exceptions import BookingNotFoundError
from checkin.infrastructure.in_memory_checkin_repo import InMemoryCheckInRepository
from checkin.main import create_app


# ---------------------------------------------------------------------------
# Fake BookingClient (mirrors the one in unit tests)
# ---------------------------------------------------------------------------

class FakeBookingClient:
    """In-process fake for the BookingClient port used in controller tests."""

    def __init__(
        self,
        booking_data: dict | None = None,
        complete_raises: Exception | None = None,
    ) -> None:
        self.booking_data = booking_data
        self.complete_raises = complete_raises
        self.complete_called_with: str | None = None

    async def get(self, booking_id: str) -> dict:
        if self.booking_data is None:
            raise BookingNotFoundError(booking_id)
        return self.booking_data

    async def complete(self, booking_id: str) -> dict:
        self.complete_called_with = booking_id
        if self.complete_raises:
            raise self.complete_raises
        return {"status": "COMPLETED"}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def repo():
    return InMemoryCheckInRepository()


@pytest.fixture
def booking_client():
    """Default: no booking pre-loaded (client returns 404)."""
    return FakeBookingClient(booking_data=None)


def _make_client(repo: InMemoryCheckInRepository, client: FakeBookingClient) -> TestClient:
    """Build a TestClient with both dependencies overridden."""
    app = create_app()
    app.dependency_overrides[get_checkin_repository] = lambda: repo
    app.dependency_overrides[get_booking_client] = lambda: client
    return TestClient(app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# POST /api/check-in/available — register property
# ---------------------------------------------------------------------------

class TestRegisterPropertyController:
    def test_register_property_returns_201_with_id_property_id_qr_token(self, repo):
        property_id = str(uuid4())
        client = _make_client(repo, FakeBookingClient())

        response = client.post("/api/check-in/available", json={"property_id": property_id})

        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["property_id"] == property_id
        assert data["qr_token"]  # non-empty string

    def test_register_duplicate_property_returns_409(self, repo):
        property_id = str(uuid4())
        client = _make_client(repo, FakeBookingClient())

        # First registration succeeds
        response = client.post("/api/check-in/available", json={"property_id": property_id})
        assert response.status_code == 201

        # Duplicate registration → 409
        response = client.post("/api/check-in/available", json={"property_id": property_id})
        assert response.status_code == 409

    def test_register_different_properties_both_succeed(self, repo):
        client = _make_client(repo, FakeBookingClient())

        r1 = client.post("/api/check-in/available", json={"property_id": str(uuid4())})
        r2 = client.post("/api/check-in/available", json={"property_id": str(uuid4())})

        assert r1.status_code == 201
        assert r2.status_code == 201
        # Tokens must differ
        assert r1.json()["qr_token"] != r2.json()["qr_token"]


# ---------------------------------------------------------------------------
# GET /api/check-in/available — check availability
# ---------------------------------------------------------------------------

class TestCheckAvailabilityController:
    def test_returns_false_for_unregistered_property(self, repo):
        property_id = str(uuid4())
        client = _make_client(repo, FakeBookingClient())
        user_id = str(uuid4())

        response = client.get(
            "/api/check-in/available",
            params={"property_id": property_id},
            headers={"X-User-Id": user_id},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_available"] is False
        assert data["property_id"] == property_id

    def test_returns_true_for_registered_property(self, repo):
        property_id = str(uuid4())
        http_client = _make_client(repo, FakeBookingClient())
        user_id = str(uuid4())

        # Register first
        http_client.post("/api/check-in/available", json={"property_id": property_id})

        response = http_client.get(
            "/api/check-in/available",
            params={"property_id": property_id},
            headers={"X-User-Id": user_id},
        )

        assert response.status_code == 200
        assert response.json()["is_available"] is True

    def test_requires_x_user_id_header(self, repo):
        property_id = str(uuid4())
        client = _make_client(repo, FakeBookingClient())

        response = client.get(
            "/api/check-in/available",
            params={"property_id": property_id},
            # no X-User-Id header
        )

        assert response.status_code == 422


# ---------------------------------------------------------------------------
# POST /api/check-in — perform check-in
# ---------------------------------------------------------------------------

def _register_property(http_client: TestClient, property_id: str) -> str:
    """Register a property via the API and return its qr_token."""
    resp = http_client.post("/api/check-in/available", json={"property_id": property_id})
    assert resp.status_code == 201
    return resp.json()["qr_token"]


class TestPerformCheckInController:
    def _make_confirmed_booking(self, user_id: str, property_id: str) -> dict:
        return {
            "id": str(uuid4()),
            "user_id": user_id,
            "property_id": property_id,
            "status": "CONFIRMED",
        }

    def test_happy_path_returns_200_with_completed_status(self, repo):
        """200 {booking_id, check_in_date, status: "COMPLETED"} on happy path."""
        user_id = str(uuid4())
        property_id = str(uuid4())
        booking_id = str(uuid4())

        booking = self._make_confirmed_booking(user_id=user_id, property_id=property_id)
        booking["id"] = booking_id
        booking_client = FakeBookingClient(booking_data=booking)
        http_client = _make_client(repo, booking_client)

        qr_token = _register_property(http_client, property_id)

        response = http_client.post(
            "/api/check-in",
            json={"booking_id": booking_id, "qr_token": qr_token},
            headers={"X-User-Id": user_id},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["booking_id"] == booking_id
        assert data["status"] == "COMPLETED"
        assert data["check_in_date"]  # non-empty

    def test_bad_qr_token_returns_400(self, repo):
        """400 when qr_token does not match any registered property."""
        user_id = str(uuid4())
        property_id = str(uuid4())
        booking_id = str(uuid4())

        booking = self._make_confirmed_booking(user_id=user_id, property_id=property_id)
        booking["id"] = booking_id
        booking_client = FakeBookingClient(booking_data=booking)
        http_client = _make_client(repo, booking_client)

        # Do NOT register the property → token is invalid
        response = http_client.post(
            "/api/check-in",
            json={"booking_id": booking_id, "qr_token": "not-a-real-token"},
            headers={"X-User-Id": user_id},
        )

        assert response.status_code == 400

    def test_wrong_user_returns_403(self, repo):
        """403 when the booking belongs to a different user."""
        owner_id = str(uuid4())
        attacker_id = str(uuid4())
        property_id = str(uuid4())
        booking_id = str(uuid4())

        booking = self._make_confirmed_booking(user_id=owner_id, property_id=property_id)
        booking["id"] = booking_id
        booking_client = FakeBookingClient(booking_data=booking)
        http_client = _make_client(repo, booking_client)

        qr_token = _register_property(http_client, property_id)

        response = http_client.post(
            "/api/check-in",
            json={"booking_id": booking_id, "qr_token": qr_token},
            headers={"X-User-Id": attacker_id},  # different user
        )

        assert response.status_code == 403

    def test_booking_not_found_returns_404(self, repo):
        """404 when booking client returns not-found."""
        user_id = str(uuid4())
        property_id = str(uuid4())

        # booking_data=None → FakeBookingClient raises BookingNotFoundError
        booking_client = FakeBookingClient(booking_data=None)
        http_client = _make_client(repo, booking_client)

        qr_token = _register_property(http_client, property_id)

        response = http_client.post(
            "/api/check-in",
            json={"booking_id": str(uuid4()), "qr_token": qr_token},
            headers={"X-User-Id": user_id},
        )

        assert response.status_code == 404

    def test_booking_not_confirmed_returns_409(self, repo):
        """409 when the booking is not in CONFIRMED status."""
        user_id = str(uuid4())
        property_id = str(uuid4())
        booking_id = str(uuid4())

        # Booking in PENDING status
        booking = {
            "id": booking_id,
            "user_id": user_id,
            "property_id": property_id,
            "status": "PENDING",
        }
        booking_client = FakeBookingClient(booking_data=booking)
        http_client = _make_client(repo, booking_client)

        qr_token = _register_property(http_client, property_id)

        response = http_client.post(
            "/api/check-in",
            json={"booking_id": booking_id, "qr_token": qr_token},
            headers={"X-User-Id": user_id},
        )

        assert response.status_code == 409

    def test_already_completed_booking_returns_409(self, repo):
        """409 when the booking is already COMPLETED (idempotency: second call is rejected)."""
        user_id = str(uuid4())
        property_id = str(uuid4())
        booking_id = str(uuid4())

        booking = {
            "id": booking_id,
            "user_id": user_id,
            "property_id": property_id,
            "status": "COMPLETED",
        }
        booking_client = FakeBookingClient(booking_data=booking)
        http_client = _make_client(repo, booking_client)

        qr_token = _register_property(http_client, property_id)

        response = http_client.post(
            "/api/check-in",
            json={"booking_id": booking_id, "qr_token": qr_token},
            headers={"X-User-Id": user_id},
        )

        assert response.status_code == 409

    def test_requires_x_user_id_header(self, repo):
        """Missing X-User-Id header → 422 validation error."""
        http_client = _make_client(repo, FakeBookingClient())

        response = http_client.post(
            "/api/check-in",
            json={"booking_id": str(uuid4()), "qr_token": "some-token"},
            # no X-User-Id header
        )

        assert response.status_code == 422

    def test_property_token_mismatch_returns_400(self, repo):
        """Token is registered but belongs to a different property than the booking → 400."""
        user_id = str(uuid4())
        property_a = str(uuid4())  # registered → has qr_token
        property_b = str(uuid4())  # booking's actual property (different)
        booking_id = str(uuid4())

        booking = {
            "id": booking_id,
            "user_id": user_id,
            "property_id": property_b,  # mismatch
            "status": "CONFIRMED",
        }
        booking_client = FakeBookingClient(booking_data=booking)
        http_client = _make_client(repo, booking_client)

        qr_token_for_a = _register_property(http_client, property_a)

        response = http_client.post(
            "/api/check-in",
            json={"booking_id": booking_id, "qr_token": qr_token_for_a},
            headers={"X-User-Id": user_id},
        )

        assert response.status_code == 400


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

class TestHealthCheck:
    def test_health(self, repo):
        client = _make_client(repo, FakeBookingClient())
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}
