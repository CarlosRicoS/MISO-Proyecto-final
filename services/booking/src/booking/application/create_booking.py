from datetime import date
from uuid import UUID

from booking.application.commands import CreateBookingCommand
from booking.application.ports import BookingRepository
from booking.domain.booking import Booking
from booking.domain.value_objects import BookingPeriod, Money


class CreateBookingUseCase:
    """
    Creates a new booking in PENDING status.

    Converts primitive inputs to domain value objects,
    constructs the aggregate, and persists via the repository port.
    """

    def __init__(self, booking_repository: BookingRepository) -> None:
        self._booking_repo = booking_repository

    async def execute(self, command: CreateBookingCommand) -> Booking:
        period = BookingPeriod(
            start_date=date.fromisoformat(command.period_start),
            end_date=date.fromisoformat(command.period_end),
        )
        price = Money(amount=command.price)

        booking = Booking(
            property_id=UUID(command.property_id),
            user_id=UUID(command.user_id),
            guests=command.guests,
            period=period,
            price=price,
            admin_group_id=UUID(command.admin_group_id),
        )

        await self._booking_repo.save(booking)
        return booking
