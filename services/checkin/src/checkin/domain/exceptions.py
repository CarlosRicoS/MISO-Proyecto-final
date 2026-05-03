from uuid import UUID


class DomainError(Exception):
    """Base class for all domain errors."""


class PropertyAlreadyRegisteredError(DomainError):
    def __init__(self, property_id: UUID) -> None:
        self.property_id = property_id
        super().__init__(f"Property {property_id} is already registered for digital check-in")


class QrTokenMismatchError(DomainError):
    def __init__(self) -> None:
        super().__init__("QR token does not match the property's registered token")


class BookingNotConfirmedError(DomainError):
    def __init__(self, booking_id: str, status: str) -> None:
        self.booking_id = booking_id
        self.status = status
        super().__init__(f"Booking {booking_id} is not in CONFIRMED status (current: {status})")


class BookingOwnershipError(DomainError):
    def __init__(self) -> None:
        super().__init__("Booking belongs to a different user")


class BookingNotFoundError(DomainError):
    def __init__(self, booking_id: str) -> None:
        self.booking_id = booking_id
        super().__init__(f"Booking with id {booking_id} not found")
