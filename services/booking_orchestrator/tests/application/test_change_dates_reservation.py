from decimal import Decimal

import pytest

from booking_orchestrator.application.change_dates_reservation import (
    ChangeDatesReservationUseCase,
)
from booking_orchestrator.domain.events import BookingDatesChangedEvent
from booking_orchestrator.domain.exceptions import BookingNotFoundError, ReservationFailedError

from .fakes import FakeBookingClient, FakePropertyClient, FakePublisher


@pytest.fixture
def change_dates_command():
    from booking_orchestrator.application.commands import ChangeDatesReservationCommand

    return ChangeDatesReservationCommand(
        booking_id="booking-xyz",
        user_id="550e8400-e29b-41d4-a716-446655440000",
        user_email="traveler@example.com",
        new_period_start="2026-07-01",
        new_period_end="2026-07-06",
        new_price=Decimal("320.00"),
    )


async def test_happy_path_returns_updated_booking(change_dates_command):
    booking = FakeBookingClient(booking_status="CONFIRMED")
    prop = FakePropertyClient()
    pub = FakePublisher()
    use_case = ChangeDatesReservationUseCase(booking, prop, pub)

    result = await use_case.execute(change_dates_command)

    assert result["price_difference"] == "70.00"
    assert result["period_start"] == "2026-07-01"
    assert len(prop.locked) == 1
    assert prop.locked[0] == ("prop-123", "2026-07-01", "2026-07-06")
    assert len(booking.dates_changed) == 1
    assert booking.got == ["booking-xyz"]


async def test_happy_path_publishes_dates_changed_event(change_dates_command):
    booking = FakeBookingClient(booking_status="CONFIRMED")
    prop = FakePropertyClient()
    pub = FakePublisher()
    use_case = ChangeDatesReservationUseCase(booking, prop, pub)

    await use_case.execute(change_dates_command)

    assert len(pub.published) == 1
    event = pub.published[0]
    assert isinstance(event, BookingDatesChangedEvent)
    assert event.booking_id == "booking-xyz"
    assert event.old_period_start == "2026-06-01"
    assert event.old_period_end == "2026-06-05"
    assert event.new_period_start == "2026-07-01"
    assert event.new_period_end == "2026-07-06"
    assert event.user_email == "traveler@example.com"


async def test_booking_not_found_raises(change_dates_command):
    booking = FakeBookingClient(fail_get=True)
    prop = FakePropertyClient()
    pub = FakePublisher()
    use_case = ChangeDatesReservationUseCase(booking, prop, pub)

    with pytest.raises(BookingNotFoundError):
        await use_case.execute(change_dates_command)

    assert prop.locked == []
    assert pub.published == []


async def test_booking_not_confirmed_raises_without_locking(change_dates_command):
    booking = FakeBookingClient(booking_status="PENDING")
    prop = FakePropertyClient()
    pub = FakePublisher()
    use_case = ChangeDatesReservationUseCase(booking, prop, pub)

    with pytest.raises(ReservationFailedError) as exc_info:
        await use_case.execute(change_dates_command)

    assert exc_info.value.reason == "booking_not_confirmed"
    assert prop.locked == []
    assert pub.published == []


async def test_property_unavailable_raises(change_dates_command):
    booking = FakeBookingClient(booking_status="CONFIRMED")
    prop = FakePropertyClient(fail_lock=True)
    pub = FakePublisher()
    use_case = ChangeDatesReservationUseCase(booking, prop, pub)

    with pytest.raises(ReservationFailedError) as exc_info:
        await use_case.execute(change_dates_command)

    assert exc_info.value.reason == "property_unavailable"
    assert booking.dates_changed == []
    assert pub.published == []


async def test_publish_failure_is_swallowed(change_dates_command):
    booking = FakeBookingClient(booking_status="CONFIRMED")
    prop = FakePropertyClient()
    pub = FakePublisher(fail_publish=True)
    use_case = ChangeDatesReservationUseCase(booking, prop, pub)

    result = await use_case.execute(change_dates_command)

    assert result["price_difference"] == "70.00"
