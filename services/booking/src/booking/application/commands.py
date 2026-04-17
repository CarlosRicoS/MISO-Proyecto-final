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


@dataclass(frozen=True)
class ChangeDatesCommand:
    """Command to change dates and price of a confirmed booking."""

    booking_id: str
    user_id: str
    new_period_start: str  # ISO date string YYYY-MM-DD
    new_period_end: str  # ISO date string YYYY-MM-DD
    new_price: Decimal


@dataclass(frozen=True)
class AdminConfirmBookingCommand:
    """Command for admin to confirm a pending booking (PENDING → APPROVED → CONFIRMED)."""

    booking_id: str


@dataclass(frozen=True)
class AdminRejectBookingCommand:
    """Command for admin to reject a pending booking (PENDING → REJECTED)."""

    booking_id: str
    reason: str


@dataclass(frozen=True)
class AdminApproveBookingCommand:
    """Command for admin to approve a pending booking (PENDING → APPROVED)."""

    booking_id: str


@dataclass(frozen=True)
class UpdatePaymentStateCommand:
    """Command to update booking payment state (APPROVED → CONFIRMED) with a real payment reference."""

    booking_id: str
    payment_reference: str
