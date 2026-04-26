"""Tests for HandleBookingApproved — both email and push behavior."""

from notifications.application.handle_booking_approved import HandleBookingApproved
from notifications.domain.events import BookingApprovedEvent


class SpyEmail:
    def __init__(self) -> None:
        self.sent: list[dict] = []

    def send(self, *, to: str, subject: str, body: str) -> None:
        self.sent.append({"to": to, "subject": subject, "body": body})


class SpyPush:
    def __init__(self) -> None:
        self.sent: list[dict] = []

    def send(self, *, user_id: str, title: str, body: str, notification_type: str, booking_id: str) -> None:
        self.sent.append({"user_id": user_id, "title": title, "body": body, "notification_type": notification_type, "booking_id": booking_id})


class _NoOpPush:
    def send(self, *, user_id: str, title: str, body: str, notification_type: str, booking_id: str) -> None:
        pass


def _make_event(**overrides) -> BookingApprovedEvent:
    defaults = dict(
        booking_id="b1",
        property_id="p1",
        period_start="2026-06-01",
        period_end="2026-06-05",
        guests=2,
        price="250.00",
        user_id="u1",
        user_email="traveler@example.com",
    )
    defaults.update(overrides)
    return BookingApprovedEvent(**defaults)


# ---- Email tests -------------------------------------------------------------

def test_handler_sends_email_to_traveler():
    spy = SpyEmail()
    handler = HandleBookingApproved(spy, _NoOpPush())
    handler(_make_event())

    assert len(spy.sent) == 1
    assert spy.sent[0]["to"] == "traveler@example.com"


def test_handler_subject_contains_booking_id():
    spy = SpyEmail()
    handler = HandleBookingApproved(spy, _NoOpPush())
    handler(_make_event())

    assert "b1" in spy.sent[0]["subject"]


def test_handler_body_contains_dates_and_price():
    spy = SpyEmail()
    handler = HandleBookingApproved(spy, _NoOpPush())
    handler(_make_event())

    body = spy.sent[0]["body"]
    assert "2026-06-01" in body
    assert "2026-06-05" in body
    assert "250.00" in body


def test_handler_body_contains_property_id():
    spy = SpyEmail()
    handler = HandleBookingApproved(spy, _NoOpPush())
    handler(_make_event())

    assert "p1" in spy.sent[0]["body"]


# ---- Push tests -------------------------------------------------------------

def test_handler_sends_push_with_correct_user_id():
    spy_push = SpyPush()
    handler = HandleBookingApproved(SpyEmail(), spy_push)
    handler(_make_event(user_id="u1", booking_id="b1"))

    assert len(spy_push.sent) == 1
    assert spy_push.sent[0]["user_id"] == "u1"


def test_handler_push_title_contains_booking_id():
    spy_push = SpyPush()
    handler = HandleBookingApproved(SpyEmail(), spy_push)
    handler(_make_event(booking_id="b1"))

    assert "b1" in spy_push.sent[0]["title"]
