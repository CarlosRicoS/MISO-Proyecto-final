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


@dataclass(frozen=True)
class AdminConfirmReservationCommand:
    """Input to the admin confirm reservation saga."""

    booking_id: str
    user_id: str
    user_email: str  # traveler's email — supplied by admin in request body


@dataclass(frozen=True)
class AdminRejectReservationCommand:
    """Input to the admin reject reservation saga."""

    booking_id: str
    user_id: str
    user_email: str  # traveler's email — supplied by admin in request body
    reason: str


@dataclass(frozen=True)
class AdminApproveReservationCommand:
    """Input to the admin approve reservation saga (PENDING → APPROVED only)."""

    booking_id: str
    user_id: str
    user_email: str  # traveler's email — supplied by admin in request body


@dataclass(frozen=True)
class CancelReservationCommand:
    """Input to the cancel reservation saga."""

    booking_id: str
    user_id: str
    user_email: str


@dataclass(frozen=True)
class MakePaymentCommand:
    """Input to the make-payment saga (APPROVED → CONFIRMED via Stripe)."""

    booking_id: str
    user_id: str
    user_email: str
    currency: str
    payment_method_type: str
