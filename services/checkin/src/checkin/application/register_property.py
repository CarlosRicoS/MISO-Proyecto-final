from uuid import UUID, uuid4

from checkin.application.commands import RegisterPropertyCommand
from checkin.application.ports import CheckInRepository
from checkin.domain.exceptions import PropertyAlreadyRegisteredError
from checkin.domain.value_objects import CheckingAvailable


class RegisterPropertyUseCase:
    """Register a property for digital check-in and return the generated QR token."""

    def __init__(self, checkin_repository: CheckInRepository) -> None:
        self._repo = checkin_repository

    async def execute(self, command: RegisterPropertyCommand) -> CheckingAvailable:
        property_uuid = UUID(command.property_id)
        existing = await self._repo.get_available_by_property(property_uuid)
        if existing is not None:
            raise PropertyAlreadyRegisteredError(property_uuid)

        qr_token = str(uuid4())
        record = CheckingAvailable(
            id=uuid4(),
            property_id=property_uuid,
            qr_token=qr_token,
        )
        await self._repo.save_available(record)
        return record
