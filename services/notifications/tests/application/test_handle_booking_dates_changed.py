from notifications.application.handle_booking_dates_changed import HandleBookingDatesChanged
from notifications.domain.events import BookingDatesChangedEvent


class SpyEmail:
    def __init__(self) -> None:
        self.sent: list[dict] = []

    def send(self, *, to: str, subject: str, body: str) -> None:
        self.sent.append({"to": to, "subject": subject, "body": body})


def _make_event(**overrides) -> BookingDatesChangedEvent:
    defaults = dict(
        booking_id="b1",
        property_id="p1",
        old_period_start="2026-06-01",
        old_period_end="2026-06-05",
        new_period_start="2026-07-01",
        new_period_end="2026-07-06",
        new_price="320.00",
        price_difference="70.00",
        user_id="u1",
        user_email="traveler@example.com",
    )
    defaults.update(overrides)
    return BookingDatesChangedEvent(**defaults)


def test_handler_sends_email_to_traveler():
    spy = SpyEmail()
    handler = HandleBookingDatesChanged(spy)
    handler(_make_event())

    assert len(spy.sent) == 1
    assert spy.sent[0]["to"] == "traveler@example.com"


def test_handler_subject_contains_booking_id():
    spy = SpyEmail()
    handler = HandleBookingDatesChanged(spy)
    handler(_make_event())

    assert "b1" in spy.sent[0]["subject"]


def test_handler_body_contains_old_and_new_dates():
    spy = SpyEmail()
    handler = HandleBookingDatesChanged(spy)
    handler(_make_event())

    body = spy.sent[0]["body"]
    assert "2026-06-01" in body
    assert "2026-06-05" in body
    assert "2026-07-01" in body
    assert "2026-07-06" in body


def test_handler_body_shows_positive_price_difference():
    spy = SpyEmail()
    handler = HandleBookingDatesChanged(spy)
    handler(_make_event(price_difference="70.00"))

    assert "+70.00" in spy.sent[0]["body"]


def test_handler_body_shows_negative_price_difference():
    spy = SpyEmail()
    handler = HandleBookingDatesChanged(spy)
    handler(_make_event(price_difference="-30.00"))

    assert "-30.00" in spy.sent[0]["body"]
