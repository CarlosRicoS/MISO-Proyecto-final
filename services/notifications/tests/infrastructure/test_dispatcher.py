import pytest

from notifications.domain.events import BookingCreatedEvent, BookingDatesChangedEvent
from notifications.domain.exceptions import UnsupportedSchemaError
from notifications.infrastructure.dispatcher import MessageDispatcher


def _make_dispatcher(**overrides):
    defaults = dict(
        booking_created_handler=lambda e: None,
        booking_dates_changed_handler=lambda e: None,
    )
    defaults.update(overrides)
    return MessageDispatcher(**defaults)


def _booking_created_message() -> dict:
    return {
        "schema_version": 1,
        "type": "BOOKING_CREATED",
        "booking": {
            "id": "b1",
            "property_id": "p1",
            "period_start": "2026-06-01",
            "period_end": "2026-06-05",
            "guests": 2,
            "price": "10",
            "status": "PENDING",
        },
        "recipient": {"user_id": "u1", "email": "t@x.com"},
    }


def _dates_changed_message() -> dict:
    return {
        "schema_version": 1,
        "type": "BOOKING_DATES_CHANGED",
        "booking": {
            "id": "b1",
            "property_id": "p1",
            "old_period_start": "2026-06-01",
            "old_period_end": "2026-06-05",
            "new_period_start": "2026-07-01",
            "new_period_end": "2026-07-06",
            "new_price": "320.00",
            "price_difference": "70.00",
        },
        "recipient": {"user_id": "u1", "email": "t@x.com"},
    }


def test_dispatches_booking_created_to_handler():
    received: list[BookingCreatedEvent] = []
    dispatcher = _make_dispatcher(booking_created_handler=received.append)
    dispatcher.dispatch(_booking_created_message())
    assert len(received) == 1
    assert received[0].booking_id == "b1"


def test_dispatches_booking_dates_changed_to_handler():
    received: list[BookingDatesChangedEvent] = []
    dispatcher = _make_dispatcher(booking_dates_changed_handler=received.append)
    dispatcher.dispatch(_dates_changed_message())
    assert len(received) == 1
    assert received[0].booking_id == "b1"
    assert received[0].new_period_start == "2026-07-01"
    assert received[0].price_difference == "70.00"


def test_rejects_unknown_schema_version():
    msg = _booking_created_message()
    msg["schema_version"] = 99
    with pytest.raises(UnsupportedSchemaError):
        _make_dispatcher().dispatch(msg)


def test_rejects_unknown_type():
    msg = _booking_created_message()
    msg["type"] = "SOMETHING_NEW"
    with pytest.raises(UnsupportedSchemaError):
        _make_dispatcher().dispatch(msg)
