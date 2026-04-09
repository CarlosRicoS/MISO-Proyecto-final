import pytest

from booking_orchestrator.application.create_reservation import CreateReservationUseCase
from booking_orchestrator.domain.exceptions import (
    BookingCreateError,
    ReservationFailedError,
)

from .fakes import FakeBookingClient, FakePropertyClient, FakePublisher


@pytest.mark.asyncio
async def test_happy_path_returns_booking_and_publishes_event(sample_command):
    booking = FakeBookingClient()
    prop = FakePropertyClient()
    pub = FakePublisher()
    use_case = CreateReservationUseCase(booking, prop, pub)

    result = await use_case.execute(sample_command)

    assert result["id"] == "booking-xyz"
    assert len(booking.created) == 1
    assert len(prop.locked) == 1
    assert prop.locked[0][0] == "prop-123"
    assert len(pub.published) == 1
    assert pub.published[0].booking_id == "booking-xyz"
    assert pub.published[0].user_email == "traveler@example.com"
    assert booking.cancelled == []


@pytest.mark.asyncio
async def test_booking_create_failure_bubbles_without_side_effects(sample_command):
    booking = FakeBookingClient(fail_create=True)
    prop = FakePropertyClient()
    pub = FakePublisher()
    use_case = CreateReservationUseCase(booking, prop, pub)

    with pytest.raises(BookingCreateError):
        await use_case.execute(sample_command)

    assert prop.locked == []
    assert pub.published == []


@pytest.mark.asyncio
async def test_lock_failure_triggers_compensation_cancel(sample_command):
    booking = FakeBookingClient()
    prop = FakePropertyClient(fail_lock=True)
    pub = FakePublisher()
    use_case = CreateReservationUseCase(booking, prop, pub)

    with pytest.raises(ReservationFailedError) as exc_info:
        await use_case.execute(sample_command)

    assert exc_info.value.reason == "property_unavailable"
    assert booking.cancelled == [("booking-xyz", sample_command.user_id)]
    assert pub.published == []


@pytest.mark.asyncio
async def test_lock_failure_and_cancel_failure_still_raises(sample_command):
    booking = FakeBookingClient(fail_cancel=True)
    prop = FakePropertyClient(fail_lock=True)
    pub = FakePublisher()
    use_case = CreateReservationUseCase(booking, prop, pub)

    with pytest.raises(ReservationFailedError):
        await use_case.execute(sample_command)


@pytest.mark.asyncio
async def test_publish_failure_is_swallowed(sample_command):
    booking = FakeBookingClient()
    prop = FakePropertyClient()
    pub = FakePublisher(fail_publish=True)
    use_case = CreateReservationUseCase(booking, prop, pub)

    # Should not raise — publish errors are logged but non-fatal.
    result = await use_case.execute(sample_command)
    assert result["id"] == "booking-xyz"
