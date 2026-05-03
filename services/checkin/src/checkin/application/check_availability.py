from uuid import UUID

from checkin.application.commands import CheckAvailabilityQuery
from checkin.application.ports import CheckInRepository


class CheckAvailabilityUseCase:
    """Check whether a property has digital check-in enabled."""

    def __init__(self, checkin_repository: CheckInRepository) -> None:
        self._repo = checkin_repository

    async def execute(self, command: CheckAvailabilityQuery) -> dict:
        record = await self._repo.get_available_by_property(UUID(command.property_id))
        return {
            "property_id": command.property_id,
            "is_available": record is not None,
        }
