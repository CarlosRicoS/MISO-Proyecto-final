"""Use case for admin rejecting a pending booking (PENDING → REJECTED)."""

from uuid import UUID

from booking.application.commands import AdminRejectBookingCommand
from booking.application.ports import BookingRepository
from booking.domain.booking import Booking


class AdminRejectBookingUseCase:
    """Admin rejects a PENDING booking with a mandatory reason.

    REJECTED is a terminal state — the booking cannot be re-opened or
    transitioned to any other status after rejection.
    """

    def __init__(self, booking_repository: BookingRepository) -> None:
        self._booking_repo = booking_repository

    async def execute(self, command: AdminRejectBookingCommand) -> Booking:
        booking = await self._booking_repo.get_by_id(UUID(command.booking_id))
        booking.reject(command.reason)
        await self._booking_repo.save(booking)
        return booking
