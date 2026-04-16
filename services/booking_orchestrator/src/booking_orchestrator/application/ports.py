"""Application-level ports — abstract interfaces that infrastructure adapters implement."""

from typing import Any, Protocol

from booking_orchestrator.application.commands import (
    ChangeDatesReservationCommand,
    CreateReservationCommand,
)
from booking_orchestrator.domain.events import (
    BookingConfirmedEvent,
    BookingCreatedEvent,
    BookingDatesChangedEvent,
    BookingRejectedEvent,
)


class BookingClient(Protocol):
    """Port for calling the booking microservice."""

    async def create(self, command: CreateReservationCommand) -> dict[str, Any]:
        """Create a PENDING booking and return the booking payload as a dict."""
        ...

    async def cancel(self, booking_id: str, user_id: str) -> None:
        """Cancel a booking. Used for saga compensation."""
        ...

    async def get(self, booking_id: str) -> dict[str, Any]:
        """Retrieve a booking by ID. Raises BookingNotFoundError on 404."""
        ...

    async def change_dates(self, command: ChangeDatesReservationCommand) -> dict[str, Any]:
        """Change dates of a confirmed booking. Returns updated booking with price_difference."""
        ...

    async def admin_confirm(self, booking_id: str) -> dict[str, Any]:
        """Admin-confirm a PENDING booking (PENDING → CONFIRMED). Returns updated booking."""
        ...

    async def admin_reject(self, booking_id: str, reason: str) -> dict[str, Any]:
        """Admin-reject a PENDING booking (PENDING → REJECTED). Returns updated booking."""
        ...


class PropertyClient(Protocol):
    """Port for calling the poc_properties microservice."""

    async def lock(self, property_id: str, period_start: str, period_end: str) -> None:
        """Lock a property for the given ISO period. Raises PropertyLockError on failure."""
        ...


class NotificationPublisher(Protocol):
    """Port for publishing domain events onto the notifications queue."""

    async def publish(
        self,
        event: BookingCreatedEvent | BookingDatesChangedEvent | BookingConfirmedEvent | BookingRejectedEvent,
    ) -> None:
        """Publish the event. Raises NotificationPublishError on failure."""
        ...
