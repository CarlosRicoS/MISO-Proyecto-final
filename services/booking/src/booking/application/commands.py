from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class CreateBookingCommand:
    """Command to create a new booking."""

    property_id: str
    user_id: str
    guests: int
    period_start: str  # ISO date string
    period_end: str  # ISO date string
    price: Decimal
    admin_group_id: str


@dataclass(frozen=True)
class CancelBookingCommand:
    """Command to cancel an existing booking."""

    booking_id: str
    user_id: str
