from notifications.domain.events import (
    BookingCancelledEvent,
    BookingConfirmedEvent,
    BookingCreatedEvent,
    BookingRejectedEvent,
    PaymentConfirmedEvent,
)


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


def test_booking_confirmed_event_from_message():
    message = {
        "schema_version": 1,
        "type": "BOOKING_CONFIRMED",
        "occurred_at": "2026-04-08T12:00:00Z",
        "booking": {
            "id": "b2",
            "property_id": "p2",
            "period_start": "2026-07-01",
            "period_end": "2026-07-05",
            "guests": 3,
            "price": "400.00",
            "payment_reference": "ADMIN-ABCD1234",
        },
        "recipient": {"user_id": "u2", "email": "confirmed@x.com"},
    }
    event = BookingConfirmedEvent.from_message(message)
    assert event.booking_id == "b2"
    assert event.payment_reference == "ADMIN-ABCD1234"
    assert event.user_email == "confirmed@x.com"
    assert event.guests == 3


def test_booking_rejected_event_from_message():
    message = {
        "schema_version": 1,
        "type": "BOOKING_REJECTED",
        "occurred_at": "2026-04-08T12:00:00Z",
        "booking": {
            "id": "b3",
            "property_id": "p3",
            "period_start": "2026-08-01",
            "period_end": "2026-08-05",
            "rejection_reason": "La propiedad no está disponible.",
        },
        "recipient": {"user_id": "u3", "email": "rejected@x.com"},
    }
    event = BookingRejectedEvent.from_message(message)
    assert event.booking_id == "b3"
    assert event.rejection_reason == "La propiedad no está disponible."
    assert event.user_email == "rejected@x.com"


def test_payment_confirmed_event_from_message():
    message = {
        "schema_version": 1,
        "type": "PAYMENT_CONFIRMED",
        "occurred_at": "2026-04-16T12:00:00Z",
        "booking": {
            "id": "b4",
            "property_id": "p4",
            "period_start": "2026-09-01",
            "period_end": "2026-09-05",
            "guests": 2,
            "price": "500.00",
            "payment_reference": "stripe-ref-abc123",
        },
        "recipient": {"user_id": "u4", "email": "payer@x.com"},
    }
    event = PaymentConfirmedEvent.from_message(message)
    assert event.booking_id == "b4"
    assert event.payment_reference == "stripe-ref-abc123"
    assert event.user_email == "payer@x.com"
    assert event.guests == 2


def test_booking_cancelled_event_from_message_with_refund_fields():
    message = {
        "schema_version": 1,
        "type": "BOOKING_CANCELLED",
        "occurred_at": "2026-04-24T12:00:00Z",
        "booking": {
            "id": "b5",
            "property_id": "p5",
            "period_start": "2026-06-01",
            "period_end": "2026-06-05",
            "cancelled_from_status": "CONFIRMED",
            "refund_amount": "150.00",
            "penalty_amount": "150.00",
        },
        "recipient": {"user_id": "u5", "email": "cancelled@x.com"},
    }
    event = BookingCancelledEvent.from_message(message)
    assert event.booking_id == "b5"
    assert event.cancelled_from_status == "CONFIRMED"
    assert event.refund_amount == "150.00"
    assert event.penalty_amount == "150.00"
    assert event.user_email == "cancelled@x.com"


def test_booking_cancelled_event_from_message_without_refund_fields():
    """Backward compatibility: old messages without refund_amount/penalty_amount default to 0.00."""
    message = {
        "schema_version": 1,
        "type": "BOOKING_CANCELLED",
        "occurred_at": "2026-04-24T12:00:00Z",
        "booking": {
            "id": "b6",
            "property_id": "p6",
            "period_start": "2026-06-01",
            "period_end": "2026-06-05",
            "cancelled_from_status": "PENDING",
        },
        "recipient": {"user_id": "u6", "email": "old@x.com"},
    }
    event = BookingCancelledEvent.from_message(message)
    assert event.booking_id == "b6"
    assert event.refund_amount == "0.00"
    assert event.penalty_amount == "0.00"
    assert event.user_email == "old@x.com"


def test_booking_cancelled_event_from_message_zero_amounts():
    """No payment case: both amounts are "0.00" strings."""
    message = {
        "schema_version": 1,
        "type": "BOOKING_CANCELLED",
        "occurred_at": "2026-04-24T12:00:00Z",
        "booking": {
            "id": "b7",
            "property_id": "p7",
            "period_start": "2026-06-01",
            "period_end": "2026-06-05",
            "cancelled_from_status": "PENDING",
            "refund_amount": "0.00",
            "penalty_amount": "0.00",
        },
        "recipient": {"user_id": "u7", "email": "zero@x.com"},
    }
    event = BookingCancelledEvent.from_message(message)
    assert event.refund_amount == "0.00"
    assert event.penalty_amount == "0.00"
