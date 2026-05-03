from typing import Protocol
from uuid import UUID

from checkin.domain.value_objects import CheckInRecord, CheckingAvailable


class CheckInRepository(Protocol):
    """Port for check-in persistence."""

    async def save_available(self, record: CheckingAvailable) -> None: ...

    async def get_available_by_property(self, property_id: UUID) -> CheckingAvailable | None: ...

    async def get_available_by_token(self, qr_token: str) -> CheckingAvailable | None: ...

    async def save_checkin(self, record: CheckInRecord) -> None: ...


class BookingClient(Protocol):
    """Port for communicating with the booking service."""

    async def get(self, booking_id: str) -> dict: ...

    async def complete(self, booking_id: str) -> dict: ...
