"""Use case for admin approving a pending booking (PENDING → APPROVED)."""

from uuid import UUID

from booking.application.commands import AdminApproveBookingCommand
from booking.application.ports import BookingRepository
from booking.domain.booking import Booking


class AdminApproveBookingUseCase:
    """Admin approves a PENDING booking.

    This only transitions the booking to APPROVED — a subsequent payment
    step is required to reach CONFIRMED.
    """

    def __init__(self, booking_repository: BookingRepository) -> None:
        self._booking_repo = booking_repository

    async def execute(self, command: AdminApproveBookingCommand) -> Booking:
        booking = await self._booking_repo.get_by_id(UUID(command.booking_id))
        booking.approve()
        await self._booking_repo.save(booking)
        return booking
