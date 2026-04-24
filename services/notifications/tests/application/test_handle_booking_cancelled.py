"""Tests for HandleBookingCancelled — email content varies by refund/penalty amounts."""

from notifications.application.handle_booking_cancelled import HandleBookingCancelled
from notifications.domain.events import BookingCancelledEvent


class SpyEmail:
    def __init__(self) -> None:
        self.sent: list[dict] = []

    def send(self, *, to: str, subject: str, body: str) -> None:
        self.sent.append({"to": to, "subject": subject, "body": body})


def _make_event(**overrides) -> BookingCancelledEvent:
    defaults = dict(
        booking_id="b1",
        property_id="p1",
        period_start="2026-06-01",
        period_end="2026-06-05",
        cancelled_from_status="CONFIRMED",
        user_id="u1",
        user_email="traveler@example.com",
        refund_amount="0.00",
        penalty_amount="0.00",
    )
    defaults.update(overrides)
    return BookingCancelledEvent(**defaults)


# ---- Free cancellation (refund > 0, penalty = 0) ----------------------------

def test_free_cancellation_email_includes_refund_amount():
    spy = SpyEmail()
    handler = HandleBookingCancelled(spy)
    handler(_make_event(refund_amount="150.00", penalty_amount="0.00"))

    assert len(spy.sent) == 1
    body = spy.sent[0]["body"]
    assert "$150.00" in body
    # Should NOT mention penalty for free cancellation
    assert "penalizaci" not in body.lower()


def test_free_cancellation_email_sent_to_correct_address():
    spy = SpyEmail()
    handler = HandleBookingCancelled(spy)
    handler(_make_event(refund_amount="150.00"))

    assert spy.sent[0]["to"] == "traveler@example.com"


def test_free_cancellation_subject_contains_booking_id():
    spy = SpyEmail()
    handler = HandleBookingCancelled(spy)
    handler(_make_event(refund_amount="150.00"))

    assert "b1" in spy.sent[0]["subject"]


# ---- Penalty cancellation (refund > 0, penalty > 0) -------------------------

def test_penalty_email_includes_both_refund_and_penalty():
    spy = SpyEmail()
    handler = HandleBookingCancelled(spy)
    handler(_make_event(refund_amount="75.00", penalty_amount="75.00"))

    body = spy.sent[0]["body"]
    assert "$75.00" in body
    # Check that penalty mention is present
    assert "penalizaci" in body.lower()


def test_penalty_email_contains_dates():
    spy = SpyEmail()
    handler = HandleBookingCancelled(spy)
    handler(_make_event(refund_amount="75.00", penalty_amount="75.00"))

    body = spy.sent[0]["body"]
    assert "2026-06-01" in body
    assert "2026-06-05" in body


# ---- No payment (both = "0.00") → "no charge" --------------------------------

def test_no_payment_email_says_no_charge():
    spy = SpyEmail()
    handler = HandleBookingCancelled(spy)
    handler(_make_event(refund_amount="0.00", penalty_amount="0.00"))

    body = spy.sent[0]["body"]
    assert "no se realiz" in body.lower() or "no charge" in body.lower()


def test_no_payment_email_does_not_mention_refund_amount():
    spy = SpyEmail()
    handler = HandleBookingCancelled(spy)
    handler(_make_event(refund_amount="0.00", penalty_amount="0.00"))

    body = spy.sent[0]["body"]
    # Should NOT mention a dollar refund amount
    assert "$0.00" not in body  # The "no charge" message is used instead


# ---- Email always contains property and booking info -------------------------

def test_email_contains_property_id():
    spy = SpyEmail()
    handler = HandleBookingCancelled(spy)
    handler(_make_event())

    assert "p1" in spy.sent[0]["body"]


def test_email_contains_booking_id_in_body():
    spy = SpyEmail()
    handler = HandleBookingCancelled(spy)
    handler(_make_event())

    assert "b1" in spy.sent[0]["body"]
