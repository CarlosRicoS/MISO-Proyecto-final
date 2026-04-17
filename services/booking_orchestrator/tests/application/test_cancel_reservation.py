import pytest

from booking_orchestrator.application.cancel_reservation import CancelReservationUseCase
from booking_orchestrator.application.commands import CancelReservationCommand
from booking_orchestrator.domain.exceptions import BookingNotFoundError, ReservationFailedError
from tests.application.fakes import FakeBookingClient, FakePublisher


def _make_command(**overrides) -> CancelReservationCommand:
    defaults = dict(
        booking_id="booking-xyz",
        user_id="user-uuid",
        user_email="traveler@example.com",
    )
    defaults.update(overrides)
    return CancelReservationCommand(**defaults)


def _make_use_case(booking=None, publisher=None):
    return CancelReservationUseCase(
        booking_client=booking or FakeBookingClient(),
        publisher=publisher or FakePublisher(),
    )


async def test_happy_path_cancels_and_publishes():
    booking = FakeBookingClient(booking_status="PENDING")
    publisher = FakePublisher()
    uc = _make_use_case(booking, publisher)

    result = await uc.execute(_make_command())

    assert result["status"] == "CANCELED"
    assert ("booking-xyz", "user-uuid") in booking.cancelled
    assert len(publisher.published) == 1
    assert publisher.published[0].booking_id == "booking-xyz"
    assert publisher.published[0].cancelled_from_status == "PENDING"


async def test_cancels_approved_booking():
    booking = FakeBookingClient(booking_status="APPROVED")
    uc = _make_use_case(booking)

    result = await uc.execute(_make_command())
    assert result["status"] == "CANCELED"


async def test_cancels_confirmed_booking():
    booking = FakeBookingClient(booking_status="CONFIRMED")
    uc = _make_use_case(booking)

    result = await uc.execute(_make_command())
    assert result["status"] == "CANCELED"


async def test_booking_not_found_raises():
    booking = FakeBookingClient(fail_get=True)
    uc = _make_use_case(booking)

    with pytest.raises(BookingNotFoundError):
        await uc.execute(_make_command())


async def test_completed_booking_raises():
    booking = FakeBookingClient(booking_status="COMPLETED")
    uc = _make_use_case(booking)

    with pytest.raises(ReservationFailedError) as exc_info:
        await uc.execute(_make_command())
    assert exc_info.value.reason == "booking_not_cancellable"


async def test_notification_failure_does_not_block_cancel():
    booking = FakeBookingClient(booking_status="PENDING")
    publisher = FakePublisher(fail_publish=True)
    uc = _make_use_case(booking, publisher)

    result = await uc.execute(_make_command())
    assert result["status"] == "CANCELED"
