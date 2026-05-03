"""Unit tests for PerformCheckInUseCase — covers all validation branches (AC-4)."""

from uuid import uuid4

import pytest

from checkin.application.commands import PerformCheckInCommand, RegisterPropertyCommand
from checkin.application.perform_checkin import PerformCheckInUseCase
from checkin.application.register_property import RegisterPropertyUseCase
from checkin.domain.exceptions import (
    BookingNotConfirmedError,
    BookingNotFoundError,
    BookingOwnershipError,
    QrTokenMismatchError,
)
from checkin.infrastructure.in_memory_checkin_repo import InMemoryCheckInRepository


# ---------------------------------------------------------------------------
# Fake BookingClient — no unittest.mock
# ---------------------------------------------------------------------------

class FakeBookingClient:
    """In-process fake for the BookingClient port."""

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
# Helpers
# ---------------------------------------------------------------------------

async def _register_property(repo: InMemoryCheckInRepository, property_id: str) -> str:
    """Register a property and return its qr_token."""
    uc = RegisterPropertyUseCase(checkin_repository=repo)
    result = await uc.execute(RegisterPropertyCommand(property_id=property_id))
    return result.qr_token


def _make_booking(
    user_id: str,
    property_id: str,
    status: str = "CONFIRMED",
) -> dict:
    return {
        "id": str(uuid4()),
        "user_id": user_id,
        "property_id": property_id,
        "status": status,
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestPerformCheckInUseCase:
    async def test_happy_path_returns_completed_result(
        self, repo: InMemoryCheckInRepository
    ):
        """Happy path: registered property + CONFIRMED booking with matching
        property_id and correct user_id → returns booking_id, check_in_date,
        status="COMPLETED".  booking_client.complete is called."""
        user_id = str(uuid4())
        property_id = str(uuid4())
        booking_id = str(uuid4())
        qr_token = await _register_property(repo, property_id)

        booking = _make_booking(user_id=user_id, property_id=property_id, status="CONFIRMED")
        booking["id"] = booking_id
        client = FakeBookingClient(booking_data=booking)

        uc = PerformCheckInUseCase(checkin_repository=repo, booking_client=client)
        result = await uc.execute(
            PerformCheckInCommand(
                booking_id=booking_id,
                qr_token=qr_token,
                user_id=user_id,
            )
        )

        assert result["booking_id"] == booking_id
        assert result["status"] == "COMPLETED"
        assert result["check_in_date"]  # non-empty date string
        assert client.complete_called_with == booking_id

    async def test_checkin_record_is_saved_to_repo(
        self, repo: InMemoryCheckInRepository
    ):
        """After a successful check-in, the CheckInRecord is persisted in the repo."""
        user_id = str(uuid4())
        property_id = str(uuid4())
        booking_id = str(uuid4())
        qr_token = await _register_property(repo, property_id)

        booking = _make_booking(user_id=user_id, property_id=property_id, status="CONFIRMED")
        booking["id"] = booking_id
        client = FakeBookingClient(booking_data=booking)

        uc = PerformCheckInUseCase(checkin_repository=repo, booking_client=client)
        await uc.execute(
            PerformCheckInCommand(
                booking_id=booking_id,
                qr_token=qr_token,
                user_id=user_id,
            )
        )

        # Check the record was appended to the in-memory store
        assert len(repo._checkins) == 1
        assert str(repo._checkins[0].booking_id) == booking_id

    async def test_bad_qr_token_raises_qr_token_mismatch_error(
        self, repo: InMemoryCheckInRepository
    ):
        """Unregistered / wrong qr_token → raises QrTokenMismatchError (→ 400)."""
        user_id = str(uuid4())
        property_id = str(uuid4())
        booking = _make_booking(user_id=user_id, property_id=property_id, status="CONFIRMED")
        client = FakeBookingClient(booking_data=booking)

        uc = PerformCheckInUseCase(checkin_repository=repo, booking_client=client)

        with pytest.raises(QrTokenMismatchError):
            await uc.execute(
                PerformCheckInCommand(
                    booking_id=booking["id"],
                    qr_token="invalid-token-that-was-never-registered",
                    user_id=user_id,
                )
            )

    async def test_booking_not_found_raises_booking_not_found_error(
        self, repo: InMemoryCheckInRepository
    ):
        """Valid token but booking doesn't exist → raises BookingNotFoundError (→ 404)."""
        property_id = str(uuid4())
        user_id = str(uuid4())
        qr_token = await _register_property(repo, property_id)

        # Client that raises BookingNotFoundError for any booking_id
        client = FakeBookingClient(booking_data=None)

        uc = PerformCheckInUseCase(checkin_repository=repo, booking_client=client)

        with pytest.raises(BookingNotFoundError):
            await uc.execute(
                PerformCheckInCommand(
                    booking_id=str(uuid4()),
                    qr_token=qr_token,
                    user_id=user_id,
                )
            )

    async def test_wrong_user_raises_booking_ownership_error(
        self, repo: InMemoryCheckInRepository
    ):
        """Booking's user_id != command.user_id → raises BookingOwnershipError (→ 403)."""
        property_id = str(uuid4())
        booking_owner_id = str(uuid4())
        attacker_id = str(uuid4())
        qr_token = await _register_property(repo, property_id)

        booking = _make_booking(
            user_id=booking_owner_id, property_id=property_id, status="CONFIRMED"
        )
        client = FakeBookingClient(booking_data=booking)

        uc = PerformCheckInUseCase(checkin_repository=repo, booking_client=client)

        with pytest.raises(BookingOwnershipError):
            await uc.execute(
                PerformCheckInCommand(
                    booking_id=booking["id"],
                    qr_token=qr_token,
                    user_id=attacker_id,  # different user
                )
            )

    async def test_property_mismatch_raises_qr_token_mismatch_error(
        self, repo: InMemoryCheckInRepository
    ):
        """Token belongs to different property than booking → raises QrTokenMismatchError."""
        user_id = str(uuid4())
        property_a = str(uuid4())  # registered property
        property_b = str(uuid4())  # booking's property (different)
        qr_token_for_a = await _register_property(repo, property_a)

        # Booking has property_b, but user scanned property_a's QR
        booking = _make_booking(user_id=user_id, property_id=property_b, status="CONFIRMED")
        client = FakeBookingClient(booking_data=booking)

        uc = PerformCheckInUseCase(checkin_repository=repo, booking_client=client)

        with pytest.raises(QrTokenMismatchError):
            await uc.execute(
                PerformCheckInCommand(
                    booking_id=booking["id"],
                    qr_token=qr_token_for_a,
                    user_id=user_id,
                )
            )

    async def test_pending_booking_raises_booking_not_confirmed_error(
        self, repo: InMemoryCheckInRepository
    ):
        """Booking status is PENDING → raises BookingNotConfirmedError (→ 409)."""
        user_id = str(uuid4())
        property_id = str(uuid4())
        qr_token = await _register_property(repo, property_id)

        booking = _make_booking(user_id=user_id, property_id=property_id, status="PENDING")
        client = FakeBookingClient(booking_data=booking)

        uc = PerformCheckInUseCase(checkin_repository=repo, booking_client=client)

        with pytest.raises(BookingNotConfirmedError) as exc_info:
            await uc.execute(
                PerformCheckInCommand(
                    booking_id=booking["id"],
                    qr_token=qr_token,
                    user_id=user_id,
                )
            )
        assert exc_info.value.status == "PENDING"

    async def test_completed_booking_raises_booking_not_confirmed_error(
        self, repo: InMemoryCheckInRepository
    ):
        """Booking status is COMPLETED → raises BookingNotConfirmedError (→ 409)."""
        user_id = str(uuid4())
        property_id = str(uuid4())
        qr_token = await _register_property(repo, property_id)

        booking = _make_booking(user_id=user_id, property_id=property_id, status="COMPLETED")
        client = FakeBookingClient(booking_data=booking)

        uc = PerformCheckInUseCase(checkin_repository=repo, booking_client=client)

        with pytest.raises(BookingNotConfirmedError) as exc_info:
            await uc.execute(
                PerformCheckInCommand(
                    booking_id=booking["id"],
                    qr_token=qr_token,
                    user_id=user_id,
                )
            )
        assert exc_info.value.status == "COMPLETED"

    async def test_canceled_booking_raises_booking_not_confirmed_error(
        self, repo: InMemoryCheckInRepository
    ):
        """Booking status is CANCELED → raises BookingNotConfirmedError (→ 409)."""
        user_id = str(uuid4())
        property_id = str(uuid4())
        qr_token = await _register_property(repo, property_id)

        booking = _make_booking(user_id=user_id, property_id=property_id, status="CANCELED")
        client = FakeBookingClient(booking_data=booking)

        uc = PerformCheckInUseCase(checkin_repository=repo, booking_client=client)

        with pytest.raises(BookingNotConfirmedError) as exc_info:
            await uc.execute(
                PerformCheckInCommand(
                    booking_id=booking["id"],
                    qr_token=qr_token,
                    user_id=user_id,
                )
            )
        assert exc_info.value.status == "CANCELED"
