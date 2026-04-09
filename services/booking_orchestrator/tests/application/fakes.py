"""In-memory fake adapters used by use-case tests — no AWS, no HTTP."""

from typing import Any

from booking_orchestrator.application.commands import CreateReservationCommand
from booking_orchestrator.domain.events import BookingCreatedEvent
from booking_orchestrator.domain.exceptions import (
    BookingCreateError,
    NotificationPublishError,
    PropertyLockError,
)


class FakeBookingClient:
    def __init__(
        self,
        fail_create: bool = False,
        fail_cancel: bool = False,
    ) -> None:
        self.fail_create = fail_create
        self.fail_cancel = fail_cancel
        self.created: list[CreateReservationCommand] = []
        self.cancelled: list[tuple[str, str]] = []

    async def create(self, command: CreateReservationCommand) -> dict[str, Any]:
        if self.fail_create:
            raise BookingCreateError("boom")
        self.created.append(command)
        return {
            "id": "booking-xyz",
            "status": "PENDING",
            "price": str(command.price),
        }

    async def cancel(self, booking_id: str, user_id: str) -> None:
        if self.fail_cancel:
            raise RuntimeError("cancel boom")
        self.cancelled.append((booking_id, user_id))


class FakePropertyClient:
    def __init__(self, fail_lock: bool = False) -> None:
        self.fail_lock = fail_lock
        self.locked: list[tuple[str, str, str]] = []

    async def lock(self, property_id: str, period_start: str, period_end: str) -> None:
        if self.fail_lock:
            raise PropertyLockError("unavailable")
        self.locked.append((property_id, period_start, period_end))


class FakePublisher:
    def __init__(self, fail_publish: bool = False) -> None:
        self.fail_publish = fail_publish
        self.published: list[BookingCreatedEvent] = []

    async def publish(self, event: BookingCreatedEvent) -> None:
        if self.fail_publish:
            raise NotificationPublishError("sqs down")
        self.published.append(event)
