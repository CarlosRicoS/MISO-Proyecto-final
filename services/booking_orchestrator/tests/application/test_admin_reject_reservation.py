import pytest

from booking_orchestrator.application.admin_reject_reservation import AdminRejectReservationUseCase
from booking_orchestrator.application.commands import AdminRejectReservationCommand
from booking_orchestrator.domain.events import BookingRejectedEvent
from booking_orchestrator.domain.exceptions import BookingNotFoundError, ReservationFailedError
from tests.application.fakes import FakeBookingClient, FakePublisher


def _make_command(**overrides) -> AdminRejectReservationCommand:
    defaults = dict(
        booking_id="booking-xyz",
        user_id="admin-uuid",
        user_email="traveler@example.com",
        reason="Double booking",
    )
    defaults.update(overrides)
    return AdminRejectReservationCommand(**defaults)


def _make_use_case(booking: FakeBookingClient | None = None, pub: FakePublisher | None = None):
    return AdminRejectReservationUseCase(
        booking_client=booking or FakeBookingClient(),
        publisher=pub or FakePublisher(),
    )


async def test_happy_path_returns_rejected_booking():
    booking = FakeBookingClient(booking_status="PENDING")
    pub = FakePublisher()
    uc = _make_use_case(booking, pub)

    result = await uc.execute(_make_command())

    assert result["status"] == "REJECTED"
    assert result["rejection_reason"] == "Double booking"


async def test_happy_path_publishes_booking_rejected_event():
    booking = FakeBookingClient(booking_status="PENDING")
    pub = FakePublisher()
    uc = _make_use_case(booking, pub)

    await uc.execute(_make_command())

    assert len(pub.published) == 1
    assert isinstance(pub.published[0], BookingRejectedEvent)
    assert pub.published[0].rejection_reason == "Double booking"
    assert pub.published[0].user_email == "traveler@example.com"


async def test_booking_not_found_raises():
    booking = FakeBookingClient(fail_get=True)
    uc = _make_use_case(booking)

    with pytest.raises(BookingNotFoundError):
        await uc.execute(_make_command())


async def test_booking_not_rejectable_raises():
    booking = FakeBookingClient(booking_status="COMPLETED")
    uc = _make_use_case(booking)

    with pytest.raises(ReservationFailedError) as exc_info:
        await uc.execute(_make_command())

    assert exc_info.value.reason == "booking_not_rejectable"


async def test_happy_path_confirmed_booking():
    booking = FakeBookingClient(booking_status="CONFIRMED")
    pub = FakePublisher()
    uc = _make_use_case(booking, pub)

    result = await uc.execute(_make_command())

    assert result["status"] == "REJECTED"
    assert result["rejection_reason"] == "Double booking"


async def test_admin_reject_error_raises_reservation_failed():
    booking = FakeBookingClient(booking_status="PENDING", fail_admin_reject=True)
    uc = _make_use_case(booking)

    with pytest.raises(ReservationFailedError):
        await uc.execute(_make_command())


async def test_rejection_reason_forwarded_to_booking_service():
    booking = FakeBookingClient(booking_status="PENDING")
    uc = _make_use_case(booking)

    await uc.execute(_make_command(reason="Property not ready"))

    assert booking.admin_rejected == [("booking-xyz", "Property not ready")]


async def test_publish_failure_is_swallowed():
    booking = FakeBookingClient(booking_status="PENDING")
    pub = FakePublisher(fail_publish=True)
    uc = _make_use_case(booking, pub)

    result = await uc.execute(_make_command())
    assert result["status"] == "REJECTED"
