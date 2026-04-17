"""Use case for updating booking payment state (APPROVED → CONFIRMED)."""

from uuid import UUID

from booking.application.commands import UpdatePaymentStateCommand
from booking.application.ports import BookingRepository
from booking.domain.booking import Booking


class UpdatePaymentStateUseCase:
    """Confirm an APPROVED booking with a real payment reference.

    Typically called after a successful Stripe payment — the payment
    reference comes from the payment gateway, not auto-generated.
    """

    def __init__(self, booking_repository: BookingRepository) -> None:
        self._booking_repo = booking_repository

    async def execute(self, command: UpdatePaymentStateCommand) -> Booking:
        booking = await self._booking_repo.get_by_id(UUID(command.booking_id))
        booking.confirm(command.payment_reference)
        await self._booking_repo.save(booking)
        return booking
