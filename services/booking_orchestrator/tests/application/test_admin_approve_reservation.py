import pytest

from booking_orchestrator.application.admin_approve_reservation import AdminApproveReservationUseCase
from booking_orchestrator.application.commands import AdminApproveReservationCommand
from booking_orchestrator.domain.exceptions import BookingNotFoundError, ReservationFailedError
from tests.application.fakes import FakeBookingClient


def _make_command(**overrides) -> AdminApproveReservationCommand:
    defaults = dict(
        booking_id="booking-xyz",
        user_id="admin-uuid",
        user_email="traveler@example.com",
    )
    defaults.update(overrides)
    return AdminApproveReservationCommand(**defaults)


def _make_use_case(booking: FakeBookingClient | None = None):
    return AdminApproveReservationUseCase(
        booking_client=booking or FakeBookingClient(),
    )


async def test_happy_path_returns_approved_booking():
    booking = FakeBookingClient(booking_status="PENDING")
    uc = _make_use_case(booking)

    result = await uc.execute(_make_command())

    assert result["status"] == "APPROVED"
    assert result["payment_reference"] is None
    assert booking.admin_approved == ["booking-xyz"]


async def test_booking_not_found_raises():
    booking = FakeBookingClient(fail_get=True)
    uc = _make_use_case(booking)

    with pytest.raises(BookingNotFoundError):
        await uc.execute(_make_command())


async def test_booking_not_pending_raises():
    booking = FakeBookingClient(booking_status="APPROVED")
    uc = _make_use_case(booking)

    with pytest.raises(ReservationFailedError) as exc_info:
        await uc.execute(_make_command())

    assert exc_info.value.reason == "booking_not_pending"


async def test_admin_approve_error_raises_reservation_failed():
    booking = FakeBookingClient(booking_status="PENDING", fail_admin_approve=True)
    uc = _make_use_case(booking)

    with pytest.raises(ReservationFailedError):
        await uc.execute(_make_command())
