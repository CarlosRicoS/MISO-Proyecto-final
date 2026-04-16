from notifications.application.handle_booking_rejected import HandleBookingRejected
from notifications.domain.events import BookingRejectedEvent


class SpyEmail:
    def __init__(self) -> None:
        self.sent: list[dict] = []

    def send(self, *, to: str, subject: str, body: str) -> None:
        self.sent.append({"to": to, "subject": subject, "body": body})


def _make_event(**overrides) -> BookingRejectedEvent:
    defaults = dict(
        booking_id="b1",
        property_id="p1",
        period_start="2026-06-01",
        period_end="2026-06-05",
        rejection_reason="La propiedad no está disponible.",
        user_id="u1",
        user_email="traveler@example.com",
    )
    defaults.update(overrides)
    return BookingRejectedEvent(**defaults)


def test_handler_sends_email_to_traveler():
    spy = SpyEmail()
    handler = HandleBookingRejected(spy)
    handler(_make_event())

    assert len(spy.sent) == 1
    assert spy.sent[0]["to"] == "traveler@example.com"


def test_handler_subject_contains_booking_id():
    spy = SpyEmail()
    handler = HandleBookingRejected(spy)
    handler(_make_event())

    assert "b1" in spy.sent[0]["subject"]


def test_handler_body_contains_dates():
    spy = SpyEmail()
    handler = HandleBookingRejected(spy)
    handler(_make_event())

    body = spy.sent[0]["body"]
    assert "2026-06-01" in body
    assert "2026-06-05" in body


def test_handler_body_contains_rejection_reason():
    spy = SpyEmail()
    handler = HandleBookingRejected(spy)
    handler(_make_event(rejection_reason="Overbooking detectado."))

    assert "Overbooking detectado." in spy.sent[0]["body"]
