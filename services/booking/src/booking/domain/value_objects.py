from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from booking.domain.exceptions import BookingValidationError, InvalidBookingPeriodError


@dataclass(frozen=True)
class BookingPeriod:
    """Validated date range for a booking."""

    start_date: date
    end_date: date

    def __post_init__(self) -> None:
        if self.start_date >= self.end_date:
            raise InvalidBookingPeriodError(
                f"Start date ({self.start_date}) must be before end date ({self.end_date})"
            )

    @property
    def nights(self) -> int:
        return (self.end_date - self.start_date).days


@dataclass(frozen=True)
class Money:
    """Non-negative monetary amount."""

    amount: Decimal

    def __post_init__(self) -> None:
        if self.amount < 0:
            raise BookingValidationError(f"Price cannot be negative: {self.amount}")
