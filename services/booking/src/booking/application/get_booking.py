from uuid import UUID

from booking.application.ports import BookingRepository
from booking.domain.booking import Booking


class GetBookingUseCase:
    """Retrieve a single booking by ID."""

    def __init__(self, booking_repository: BookingRepository) -> None:
        self._booking_repo = booking_repository

    async def execute(self, booking_id: str) -> Booking:
        return await self._booking_repo.get_by_id(UUID(booking_id))


class ListUserBookingsUseCase:
    """List all bookings for a given user."""

    def __init__(self, booking_repository: BookingRepository) -> None:
        self._booking_repo = booking_repository

    async def execute(self, user_id: str) -> list[Booking]:
        return await self._booking_repo.list_by_user(UUID(user_id))
