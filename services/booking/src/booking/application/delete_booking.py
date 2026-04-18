from uuid import UUID

from booking.application.ports import BookingRepository
from booking.domain.booking import BookingStatus
from booking.domain.exceptions import InvalidBookingStatusTransitionError


class DeleteBookingUseCase:
    """Delete a PENDING booking (saga compensation).

    Only bookings in PENDING status can be deleted — this prevents
    accidental removal of bookings that have progressed further.
    """

    def __init__(self, booking_repository: BookingRepository) -> None:
        self._booking_repo = booking_repository

    async def execute(self, booking_id: str) -> None:
        booking = await self._booking_repo.get_by_id(UUID(booking_id))
        if booking.status != BookingStatus.PENDING:
            raise InvalidBookingStatusTransitionError(booking.status.value, "DELETE")
        await self._booking_repo.delete(booking.id)
