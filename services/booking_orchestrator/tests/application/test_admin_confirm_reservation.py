import pytest

from booking_orchestrator.application.admin_confirm_reservation import AdminConfirmReservationUseCase
from booking_orchestrator.application.commands import AdminConfirmReservationCommand
from booking_orchestrator.domain.events import BookingConfirmedEvent
from booking_orchestrator.domain.exceptions import BookingNotFoundError, ReservationFailedError
from tests.application.fakes import FakeBookingClient, FakePublisher


def _make_command(**overrides) -> AdminConfirmReservationCommand:
    defaults = dict(
        booking_id="booking-xyz",
        user_id="admin-uuid",
        user_email="traveler@example.com",
    )
    defaults.update(overrides)
    return AdminConfirmReservationCommand(**defaults)


def _make_use_case(booking: FakeBookingClient | None = None, pub: FakePublisher | None = None):
    return AdminConfirmReservationUseCase(
        booking_client=booking or FakeBookingClient(),
        publisher=pub or FakePublisher(),
    )


async def test_happy_path_returns_confirmed_booking():
    booking = FakeBookingClient(booking_status="PENDING")
    pub = FakePublisher()
    uc = _make_use_case(booking, pub)

    result = await uc.execute(_make_command())

    assert result["status"] == "CONFIRMED"
    assert result["payment_reference"] == "ADMIN-ABCD1234"
    assert booking.admin_confirmed == ["booking-xyz"]


async def test_happy_path_publishes_booking_confirmed_event():
    booking = FakeBookingClient(booking_status="PENDING")
    pub = FakePublisher()
    uc = _make_use_case(booking, pub)

    await uc.execute(_make_command())

    assert len(pub.published) == 1
    assert isinstance(pub.published[0], BookingConfirmedEvent)
    assert pub.published[0].user_email == "traveler@example.com"
    assert pub.published[0].payment_reference == "ADMIN-ABCD1234"


async def test_booking_not_found_raises():
    booking = FakeBookingClient(fail_get=True)
    uc = _make_use_case(booking)

    with pytest.raises(BookingNotFoundError):
        await uc.execute(_make_command())


async def test_booking_not_pending_raises():
    booking = FakeBookingClient(booking_status="CONFIRMED")
    uc = _make_use_case(booking)

    with pytest.raises(ReservationFailedError) as exc_info:
        await uc.execute(_make_command())

    assert exc_info.value.reason == "booking_not_pending"


async def test_admin_confirm_error_raises_reservation_failed():
    booking = FakeBookingClient(booking_status="PENDING", fail_admin_confirm=True)
    uc = _make_use_case(booking)

    with pytest.raises(ReservationFailedError):
        await uc.execute(_make_command())


async def test_publish_failure_is_swallowed():
    booking = FakeBookingClient(booking_status="PENDING")
    pub = FakePublisher(fail_publish=True)
    uc = _make_use_case(booking, pub)

    # Should not raise despite publish failure
    result = await uc.execute(_make_command())
    assert result["status"] == "CONFIRMED"
