from notifications.domain.events import BookingCreatedEvent


def test_from_message_extracts_nested_fields():
    message = {
        "schema_version": 1,
        "type": "BOOKING_CREATED",
        "occurred_at": "2026-04-08T12:00:00Z",
        "booking": {
            "id": "b1",
            "property_id": "p1",
            "period_start": "2026-06-01",
            "period_end": "2026-06-05",
            "guests": 2,
            "price": "250.00",
            "status": "PENDING",
        },
        "recipient": {"user_id": "u1", "email": "t@x.com"},
    }
    event = BookingCreatedEvent.from_message(message)
    assert event.booking_id == "b1"
    assert event.user_email == "t@x.com"
    assert event.guests == 2
