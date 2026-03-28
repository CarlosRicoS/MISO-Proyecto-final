from uuid import UUID

from booking.application.commands import CancelBookingCommand
from booking.application.ports import BookingRepository
from booking.domain.booking import Booking


class CancelBookingUseCase:
    """
    Cancel an existing booking.

    Delegates cancellation logic to the Booking entity,
    which enforces the state machine rules.
    """

    def __init__(self, booking_repository: BookingRepository) -> None:
        self._booking_repo = booking_repository

    async def execute(self, command: CancelBookingCommand) -> Booking:
        booking = await self._booking_repo.get_by_id(UUID(command.booking_id))
        booking.cancel()
        await self._booking_repo.save(booking)
        return booking
