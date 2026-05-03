from dataclasses import dataclass, field
from datetime import date
from uuid import UUID, uuid4


@dataclass(frozen=True)
class CheckingAvailable:
    """Records that a property is registered for digital check-in."""

    id: UUID
    property_id: UUID
    qr_token: str  # uuid4 hex string embedded in the hotel QR code


@dataclass(frozen=True)
class CheckInRecord:
    """Records a completed digital check-in."""

    id: UUID
    booking_id: UUID
    check_in_date: date
