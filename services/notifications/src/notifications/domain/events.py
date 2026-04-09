"""Domain representation of events consumed from notifications_queue."""

from dataclasses import dataclass
from typing import Any

SUPPORTED_SCHEMA_VERSION = 1


@dataclass(frozen=True)
class BookingCreatedEvent:
    booking_id: str
    property_id: str
    period_start: str
    period_end: str
    guests: int
    price: str
    status: str
    user_id: str
    user_email: str

    @classmethod
    def from_message(cls, message: dict[str, Any]) -> "BookingCreatedEvent":
        booking = message["booking"]
        recipient = message["recipient"]
        return cls(
            booking_id=booking["id"],
            property_id=booking["property_id"],
            period_start=booking["period_start"],
            period_end=booking["period_end"],
            guests=booking["guests"],
            price=str(booking["price"]),
            status=booking["status"],
            user_id=recipient["user_id"],
            user_email=recipient["email"],
        )
