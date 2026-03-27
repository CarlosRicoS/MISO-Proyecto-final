from uuid import UUID


class DomainError(Exception):
    """Base class for all domain errors."""


class BookingNotFoundError(DomainError):
    def __init__(self, booking_id: UUID) -> None:
        self.booking_id = booking_id
        super().__init__(f"Booking with id {booking_id} not found")


class BookingValidationError(DomainError):
    def __init__(self, message: str) -> None:
        super().__init__(message)


class BookingAlreadyCancelledError(DomainError):
    def __init__(self, booking_id: UUID) -> None:
        self.booking_id = booking_id
        super().__init__(f"Booking with id {booking_id} is already cancelled")


class InvalidBookingPeriodError(DomainError):
    def __init__(self, message: str) -> None:
        super().__init__(message)


class InvalidBookingStatusTransitionError(DomainError):
    def __init__(self, current: str, target: str) -> None:
        self.current = current
        self.target = target
        super().__init__(f"Cannot transition from {current} to {target}")
