import pytest

from notifications.domain.events import BookingCreatedEvent
from notifications.domain.exceptions import UnsupportedSchemaError
from notifications.infrastructure.dispatcher import MessageDispatcher


def _valid_message() -> dict:
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


def test_dispatches_booking_created_to_handler():
    received: list[BookingCreatedEvent] = []
    dispatcher = MessageDispatcher(booking_created_handler=received.append)
    dispatcher.dispatch(_valid_message())
    assert len(received) == 1
    assert received[0].booking_id == "b1"


def test_rejects_unknown_schema_version():
    msg = _valid_message()
    msg["schema_version"] = 99
    dispatcher = MessageDispatcher(booking_created_handler=lambda e: None)
    with pytest.raises(UnsupportedSchemaError):
        dispatcher.dispatch(msg)


def test_rejects_unknown_type():
    msg = _valid_message()
    msg["type"] = "SOMETHING_NEW"
    dispatcher = MessageDispatcher(booking_created_handler=lambda e: None)
    with pytest.raises(UnsupportedSchemaError):
        dispatcher.dispatch(msg)
