from notifications.application.handle_booking_created import HandleBookingCreated
from notifications.domain.events import BookingCreatedEvent


class SpyEmail:
    def __init__(self) -> None:
        self.sent: list[dict] = []

    def send(self, *, to: str, subject: str, body: str) -> None:
        self.sent.append({"to": to, "subject": subject, "body": body})


def test_handler_sends_email_with_booking_details():
    spy = SpyEmail()
    handler = HandleBookingCreated(spy)
    event = BookingCreatedEvent(
        booking_id="b1",
        property_id="p1",
        period_start="2026-06-01",
        period_end="2026-06-05",
        guests=2,
        price="250.00",
        status="PENDING",
        user_id="u1",
        user_email="traveler@example.com",
    )

    handler(event)

    assert len(spy.sent) == 1
    sent = spy.sent[0]
    assert sent["to"] == "traveler@example.com"
    assert "b1" in sent["subject"]
    assert "p1" in sent["body"]
    assert "2026-06-01" in sent["body"]
    assert "PENDING" in sent["body"]
