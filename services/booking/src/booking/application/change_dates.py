from datetime import date
from decimal import Decimal
from uuid import UUID

from booking.application.commands import ChangeDatesCommand
from booking.application.ports import BookingRepository
from booking.domain.booking import Booking
from booking.domain.value_objects import BookingPeriod, Money


class ChangeDatesUseCase:
    """Change the dates and price of a confirmed booking.

    Returns the updated booking together with the price difference (new - old).
    """

    def __init__(self, booking_repository: BookingRepository) -> None:
        self._booking_repo = booking_repository

    async def execute(self, command: ChangeDatesCommand) -> tuple[Booking, Decimal]:
        booking = await self._booking_repo.get_by_id(UUID(command.booking_id))
        new_period = BookingPeriod(
            start_date=date.fromisoformat(command.new_period_start),
            end_date=date.fromisoformat(command.new_period_end),
        )
        new_price = Money(amount=command.new_price)
        price_difference = booking.change_dates(new_period, new_price)
        await self._booking_repo.save(booking)
        return booking, price_difference
