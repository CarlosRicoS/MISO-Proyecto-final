from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from checkin.domain.value_objects import CheckInRecord, CheckingAvailable
from checkin.infrastructure.models import CheckingAvailableModel, CheckingModel


class SqlAlchemyCheckInRepository:
    """
    Async SQLAlchemy adapter implementing CheckInRepository port.

    Note: This class does NOT inherit from CheckInRepository Protocol.
    Protocol uses structural typing — matching method signatures is sufficient.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save_available(self, record: CheckingAvailable) -> None:
        model = self._to_available_model(record)
        await self._session.merge(model)
        await self._session.flush()

    async def get_available_by_property(self, property_id: UUID) -> CheckingAvailable | None:
        stmt = select(CheckingAvailableModel).where(
            CheckingAvailableModel.property_id == property_id
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        if model is None:
            return None
        return self._to_available_domain(model)

    async def get_available_by_token(self, qr_token: str) -> CheckingAvailable | None:
        stmt = select(CheckingAvailableModel).where(
            CheckingAvailableModel.qr_token == qr_token
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        if model is None:
            return None
        return self._to_available_domain(model)

    async def save_checkin(self, record: CheckInRecord) -> None:
        model = self._to_checkin_model(record)
        self._session.add(model)
        await self._session.flush()

    @staticmethod
    def _to_available_model(record: CheckingAvailable) -> CheckingAvailableModel:
        return CheckingAvailableModel(
            id=record.id,
            property_id=record.property_id,
            qr_token=record.qr_token,
        )

    @staticmethod
    def _to_available_domain(model: CheckingAvailableModel) -> CheckingAvailable:
        return CheckingAvailable(
            id=model.id,
            property_id=model.property_id,
            qr_token=model.qr_token,
        )

    @staticmethod
    def _to_checkin_model(record: CheckInRecord) -> CheckingModel:
        return CheckingModel(
            id=record.id,
            booking_id=record.booking_id,
            check_in_date=record.check_in_date,
        )

    @staticmethod
    def _to_checkin_domain(model: CheckingModel) -> CheckInRecord:
        return CheckInRecord(
            id=model.id,
            booking_id=model.booking_id,
            check_in_date=model.check_in_date,
        )
