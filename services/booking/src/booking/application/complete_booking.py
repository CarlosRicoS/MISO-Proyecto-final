from uuid import UUID

from booking.application.commands import CompleteBookingCommand
from booking.application.ports import BookingRepository
from booking.domain.booking import Booking


class CompleteBookingUseCase:
    """
    Complete a confirmed booking (CONFIRMED → COMPLETED).

    Delegates to the Booking entity's complete() method,
    which enforces the state machine rules.
    """

    def __init__(self, booking_repository: BookingRepository) -> None:
        self._booking_repo = booking_repository

    async def execute(self, command: CompleteBookingCommand) -> Booking:
        booking = await self._booking_repo.get_by_id(UUID(command.booking_id))
        booking.complete()
        await self._booking_repo.save(booking)
        return booking
