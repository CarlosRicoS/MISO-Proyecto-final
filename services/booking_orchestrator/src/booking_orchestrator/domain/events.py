"""Domain events published by the orchestrator onto the notifications queue."""

from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

SCHEMA_VERSION = 1


@dataclass(frozen=True)
class BookingCreatedEvent:
    booking_id: str
    property_id: str
    user_id: str
    user_email: str
    period_start: str
    period_end: str
    guests: int
    price: Decimal
    status: str

    def to_message(self) -> dict[str, Any]:
        """Serialize to the versioned JSON schema consumed by the notifications service."""
        return {
            "schema_version": SCHEMA_VERSION,
            "type": "BOOKING_CREATED",
            "occurred_at": datetime.now(UTC).isoformat(),
            "booking": {
                "id": self.booking_id,
                "property_id": self.property_id,
                "period_start": self.period_start,
                "period_end": self.period_end,
                "guests": self.guests,
                "price": str(self.price),
                "status": self.status,
            },
            "recipient": {
                "user_id": self.user_id,
                "email": self.user_email,
            },
        }
