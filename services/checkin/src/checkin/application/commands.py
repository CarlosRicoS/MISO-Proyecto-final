from dataclasses import dataclass


@dataclass(frozen=True)
class RegisterPropertyCommand:
    """Command to register a property for digital check-in."""

    property_id: str


@dataclass(frozen=True)
class CheckAvailabilityQuery:
    """Query to check whether a property has digital check-in enabled."""

    property_id: str


@dataclass(frozen=True)
class PerformCheckInCommand:
    """Command to perform digital check-in for a booking."""

    booking_id: str
    qr_token: str
    user_id: str  # injected from X-User-Id header
