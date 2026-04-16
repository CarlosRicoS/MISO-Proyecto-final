"""Use case for admin confirming a pending booking (PENDING → APPROVED → CONFIRMED)."""

from uuid import UUID, uuid4

from booking.application.commands import AdminConfirmBookingCommand
from booking.application.ports import BookingRepository
from booking.domain.booking import Booking


class AdminConfirmBookingUseCase:
    """Admin confirms a PENDING booking in one step.

    Internally calls approve() then confirm() with an auto-generated payment
    reference (ADMIN-{8 hex chars}). This keeps the existing state machine
    intact while presenting a single action to the admin.
    """

    def __init__(self, booking_repository: BookingRepository) -> None:
        self._booking_repo = booking_repository

    async def execute(self, command: AdminConfirmBookingCommand) -> Booking:
        booking = await self._booking_repo.get_by_id(UUID(command.booking_id))
        payment_reference = f"ADMIN-{uuid4().hex[:8].upper()}"
        booking.approve()
        booking.confirm(payment_reference)
        await self._booking_repo.save(booking)
        return booking
