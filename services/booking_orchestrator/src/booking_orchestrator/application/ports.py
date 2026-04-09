"""Application-level ports — abstract interfaces that infrastructure adapters implement."""

from typing import Any, Protocol

from booking_orchestrator.application.commands import CreateReservationCommand
from booking_orchestrator.domain.events import BookingCreatedEvent


class BookingClient(Protocol):
    """Port for calling the booking microservice."""

    async def create(self, command: CreateReservationCommand) -> dict[str, Any]:
        """Create a PENDING booking and return the booking payload as a dict."""
        ...

    async def cancel(self, booking_id: str, user_id: str) -> None:
        """Cancel a booking. Used for saga compensation."""
        ...


class PropertyClient(Protocol):
    """Port for calling the poc_properties microservice."""

    async def lock(self, property_id: str, period_start: str, period_end: str) -> None:
        """Lock a property for the given ISO period. Raises PropertyLockError on failure."""
        ...


class NotificationPublisher(Protocol):
    """Port for publishing domain events onto the notifications queue."""

    async def publish(self, event: BookingCreatedEvent) -> None:
        """Publish the event. Raises NotificationPublishError on failure."""
        ...
