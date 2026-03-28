from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from booking.domain.booking import Booking, BookingStatus
from booking.domain.exceptions import BookingNotFoundError
from booking.domain.value_objects import BookingPeriod, Money
from booking.infrastructure.models import BookingModel


class SqlAlchemyBookingRepository:
    """
    Async SQLAlchemy adapter implementing BookingRepository port.

    Note: This class does NOT inherit from BookingRepository Protocol.
    Protocol uses structural typing — matching method signatures is sufficient.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save(self, booking: Booking) -> None:
        model = self._to_model(booking)
        await self._session.merge(model)
        await self._session.flush()

    async def get_by_id(self, booking_id: UUID) -> Booking:
        stmt = select(BookingModel).where(BookingModel.id == booking_id)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        if model is None:
            raise BookingNotFoundError(booking_id)
        return self._to_domain(model)

    async def list_by_user(self, user_id: UUID) -> list[Booking]:
        stmt = (
            select(BookingModel)
            .where(BookingModel.user_id == user_id)
            .order_by(BookingModel.created_at.desc())
        )
        result = await self._session.execute(stmt)
        return [self._to_domain(m) for m in result.scalars().all()]

    async def delete(self, booking_id: UUID) -> None:
        stmt = select(BookingModel).where(BookingModel.id == booking_id)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        if model is None:
            raise BookingNotFoundError(booking_id)
        await self._session.delete(model)
        await self._session.flush()

    @staticmethod
    def _to_model(booking: Booking) -> BookingModel:
        return BookingModel(
            id=booking.id,
            property_id=booking.property_id,
            user_id=booking.user_id,
            guests=booking.guests,
            period_start=booking.period.start_date,
            period_end=booking.period.end_date,
            price=booking.price.amount,
            status=booking.status.value,
            admin_group_id=booking.admin_group_id,
            payment_reference=booking.payment_reference,
            created_at=booking.created_at,
        )

    @staticmethod
    def _to_domain(model: BookingModel) -> Booking:
        return Booking(
            id=model.id,
            property_id=model.property_id,
            user_id=model.user_id,
            guests=model.guests,
            period=BookingPeriod(
                start_date=model.period_start,
                end_date=model.period_end,
            ),
            price=Money(amount=model.price),
            status=BookingStatus(model.status),
            admin_group_id=model.admin_group_id,
            payment_reference=model.payment_reference,
            created_at=model.created_at,
        )
