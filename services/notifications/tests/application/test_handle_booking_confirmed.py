from notifications.application.handle_booking_confirmed import HandleBookingConfirmed
from notifications.domain.events import BookingConfirmedEvent


class SpyEmail:
    def __init__(self) -> None:
        self.sent: list[dict] = []

    def send(self, *, to: str, subject: str, body: str) -> None:
        self.sent.append({"to": to, "subject": subject, "body": body})


def _make_event(**overrides) -> BookingConfirmedEvent:
    defaults = dict(
        booking_id="b1",
        property_id="p1",
        period_start="2026-06-01",
        period_end="2026-06-05",
        guests=2,
        price="320.00",
        payment_reference="ADMIN-3F7A9C2B",
        user_id="u1",
        user_email="traveler@example.com",
    )
    defaults.update(overrides)
    return BookingConfirmedEvent(**defaults)


def test_handler_sends_email_to_traveler():
    spy = SpyEmail()
    handler = HandleBookingConfirmed(spy)
    handler(_make_event())

    assert len(spy.sent) == 1
    assert spy.sent[0]["to"] == "traveler@example.com"


def test_handler_subject_contains_booking_id():
    spy = SpyEmail()
    handler = HandleBookingConfirmed(spy)
    handler(_make_event())

    assert "b1" in spy.sent[0]["subject"]


def test_handler_body_contains_dates_and_price():
    spy = SpyEmail()
    handler = HandleBookingConfirmed(spy)
    handler(_make_event())

    body = spy.sent[0]["body"]
    assert "2026-06-01" in body
    assert "2026-06-05" in body
    assert "320.00" in body


def test_handler_body_contains_payment_reference():
    spy = SpyEmail()
    handler = HandleBookingConfirmed(spy)
    handler(_make_event(payment_reference="ADMIN-ABCD1234"))

    assert "ADMIN-ABCD1234" in spy.sent[0]["body"]
