from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class CreateReservationCommand:
    """Input to the create reservation saga."""

    property_id: str
    user_id: str
    user_email: str
    guests: int
    period_start: str  # ISO format YYYY-MM-DD
    period_end: str
    price: Decimal
    admin_group_id: str


@dataclass(frozen=True)
class ChangeDatesReservationCommand:
    """Input to the change-dates saga."""

    booking_id: str
    user_id: str
    user_email: str
    new_period_start: str  # ISO format YYYY-MM-DD
    new_period_end: str
    new_price: Decimal
