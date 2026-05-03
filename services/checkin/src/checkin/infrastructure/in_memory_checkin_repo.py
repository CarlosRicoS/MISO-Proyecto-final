from uuid import UUID

from checkin.domain.value_objects import CheckInRecord, CheckingAvailable


class InMemoryCheckInRepository:
    """
    In-memory fake implementing CheckInRepository port.

    Used for fast unit tests without database dependencies.
    """

    def __init__(self) -> None:
        self._available: dict[UUID, CheckingAvailable] = {}
        self._checkins: list[CheckInRecord] = []

    async def save_available(self, record: CheckingAvailable) -> None:
        self._available[record.property_id] = record

    async def get_available_by_property(self, property_id: UUID) -> CheckingAvailable | None:
        return self._available.get(property_id)

    async def get_available_by_token(self, qr_token: str) -> CheckingAvailable | None:
        for record in self._available.values():
            if record.qr_token == qr_token:
                return record
        return None

    async def save_checkin(self, record: CheckInRecord) -> None:
        self._checkins.append(record)
