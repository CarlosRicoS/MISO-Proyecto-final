from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from enum import StrEnum
from uuid import UUID, uuid4

from booking.domain.exceptions import (
    BookingAlreadyCancelledError,
    BookingDateChangeNotAllowedError,
    BookingValidationError,
    InvalidBookingStatusTransitionError,
)
from booking.domain.value_objects import BookingPeriod, Money


class BookingStatus(StrEnum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    CONFIRMED = "CONFIRMED"
    CANCELED = "CANCELED"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"


# Valid status transitions: current_status -> set of allowed next statuses
_VALID_TRANSITIONS: dict[BookingStatus, set[BookingStatus]] = {
    BookingStatus.PENDING: {BookingStatus.APPROVED, BookingStatus.CONFIRMED, BookingStatus.CANCELED, BookingStatus.REJECTED},
    BookingStatus.APPROVED: {BookingStatus.CONFIRMED, BookingStatus.CANCELED},
    BookingStatus.CONFIRMED: {BookingStatus.COMPLETED, BookingStatus.CANCELED, BookingStatus.REJECTED},
    BookingStatus.COMPLETED: set(),
    BookingStatus.CANCELED: set(),
    BookingStatus.REJECTED: set(),
}


@dataclass
class Booking:
    """
    Booking aggregate root.

    Business rules:
    - Guests must be >= 1
    - Period must have start < end
    - Status transitions follow a strict state machine
    - Only PENDING/APPROVED/CONFIRMED bookings can be cancelled
    """

    property_id: UUID
    user_id: UUID
    guests: int
    period: BookingPeriod
    price: Money
    admin_group_id: UUID
    id: UUID = field(default_factory=uuid4)
    status: BookingStatus = BookingStatus.PENDING
    payment_reference: str | None = None
    rejection_reason: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def __post_init__(self) -> None:
        self._validate()

    def _validate(self) -> None:
        if self.guests < 1:
            raise BookingValidationError("Guests must be at least 1")

    def cancel(self) -> None:
        """Cancel this booking. Raises if already cancelled or completed."""
        if self.status == BookingStatus.CANCELED:
            raise BookingAlreadyCancelledError(self.id)
        self._transition_to(BookingStatus.CANCELED)

    def approve(self) -> None:
        """Approve a pending booking."""
        self._transition_to(BookingStatus.APPROVED)

    def confirm(self, payment_reference: str) -> None:
        """Confirm an approved booking with a payment reference."""
        self._transition_to(BookingStatus.CONFIRMED)
        self.payment_reference = payment_reference

    def complete(self) -> None:
        """Mark a confirmed booking as completed."""
        self._transition_to(BookingStatus.COMPLETED)

    def reject(self, reason: str) -> None:
        """Reject a pending or confirmed booking. A non-empty reason is required."""
        if not reason or not reason.strip():
            raise BookingValidationError("Rejection reason cannot be empty")
        self._transition_to(BookingStatus.REJECTED)
        self.rejection_reason = reason

    def change_dates(self, new_period: BookingPeriod, new_price: Money) -> Decimal:
        """Change booking dates and price. Returns price_difference (new - old).

        Only CONFIRMED bookings may have their dates changed.
        """
        if self.status != BookingStatus.CONFIRMED:
            raise BookingDateChangeNotAllowedError(self.id, self.status.value)
        old_amount = self.price.amount
        self.period = new_period
        self.price = new_price
        return new_price.amount - old_amount

    def _transition_to(self, target: BookingStatus) -> None:
        allowed = _VALID_TRANSITIONS.get(self.status, set())
        if target not in allowed:
            raise InvalidBookingStatusTransitionError(self.status.value, target.value)
        self.status = target
