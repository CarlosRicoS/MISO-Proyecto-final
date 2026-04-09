from decimal import Decimal

from booking_orchestrator.domain.events import SCHEMA_VERSION, BookingCreatedEvent


def test_event_serializes_to_versioned_schema():
    event = BookingCreatedEvent(
        booking_id="b1",
        property_id="p1",
        user_id="u1",
        user_email="x@y.z",
        period_start="2026-06-01",
        period_end="2026-06-05",
        guests=2,
        price=Decimal("250.00"),
        status="PENDING",
    )

    msg = event.to_message()

    assert msg["schema_version"] == SCHEMA_VERSION
    assert msg["type"] == "BOOKING_CREATED"
    assert msg["booking"]["id"] == "b1"
    assert msg["booking"]["price"] == "250.00"
    assert msg["recipient"]["email"] == "x@y.z"
    assert "occurred_at" in msg
