from typing import Protocol
from uuid import UUID

from booking.domain.booking import Booking


class BookingRepository(Protocol):
    """Port for booking persistence."""

    async def save(self, booking: Booking) -> None: ...

    async def get_by_id(self, booking_id: UUID) -> Booking: ...

    async def list_by_user(self, user_id: UUID) -> list[Booking]: ...

    async def delete(self, booking_id: UUID) -> None: ...
