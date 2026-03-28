from uuid import UUID

from booking.domain.booking import Booking
from booking.domain.exceptions import BookingNotFoundError


class InMemoryBookingRepository:
    """
    In-memory fake implementing BookingRepository port.

    Used for fast unit tests without database dependencies.
    """

    def __init__(self) -> None:
        self._store: dict[UUID, Booking] = {}

    async def save(self, booking: Booking) -> None:
        self._store[booking.id] = booking

    async def get_by_id(self, booking_id: UUID) -> Booking:
        booking = self._store.get(booking_id)
        if booking is None:
            raise BookingNotFoundError(booking_id)
        return booking

    async def list_by_user(self, user_id: UUID) -> list[Booking]:
        return sorted(
            (b for b in self._store.values() if b.user_id == user_id),
            key=lambda b: b.created_at,
            reverse=True,
        )

    async def delete(self, booking_id: UUID) -> None:
        if booking_id not in self._store:
            raise BookingNotFoundError(booking_id)
        del self._store[booking_id]
