"""In-memory fake adapters used by use-case tests — no AWS, no HTTP."""

from typing import Any

from booking_orchestrator.application.commands import (
    ChangeDatesReservationCommand,
    CreateReservationCommand,
)
from booking_orchestrator.domain.exceptions import (
    BookingChangeDatesError,
    BookingConfirmError,
    BookingCreateError,
    BookingNotFoundError,
    BookingRejectError,
    NotificationPublishError,
    PropertyLockError,
)


class FakeBookingClient:
    def __init__(
        self,
        fail_create: bool = False,
        fail_cancel: bool = False,
        fail_get: bool = False,
        fail_change_dates: bool = False,
        fail_admin_confirm: bool = False,
        fail_admin_reject: bool = False,
        booking_status: str = "PENDING",
    ) -> None:
        self.fail_create = fail_create
        self.fail_cancel = fail_cancel
        self.fail_get = fail_get
        self.fail_change_dates = fail_change_dates
        self.fail_admin_confirm = fail_admin_confirm
        self.fail_admin_reject = fail_admin_reject
        self.booking_status = booking_status
        self.created: list[CreateReservationCommand] = []
        self.cancelled: list[tuple[str, str]] = []
        self.got: list[str] = []
        self.dates_changed: list[ChangeDatesReservationCommand] = []
        self.admin_confirmed: list[str] = []
        self.admin_rejected: list[tuple[str, str]] = []

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

    async def get(self, booking_id: str) -> dict[str, Any]:
        if self.fail_get:
            raise BookingNotFoundError(booking_id)
        self.got.append(booking_id)
        return {
            "id": booking_id,
            "property_id": "prop-123",
            "user_id": "user-xyz",
            "period_start": "2026-06-01",
            "period_end": "2026-06-05",
            "price": "250.00",
            "status": self.booking_status,
        }

    async def change_dates(self, command: ChangeDatesReservationCommand) -> dict[str, Any]:
        if self.fail_change_dates:
            raise BookingChangeDatesError("invalid period", 422)
        self.dates_changed.append(command)
        return {
            "id": command.booking_id,
            "property_id": "prop-123",
            "period_start": command.new_period_start,
            "period_end": command.new_period_end,
            "price": str(command.new_price),
            "price_difference": "70.00",
            "status": "CONFIRMED",
        }

    async def admin_confirm(self, booking_id: str) -> dict[str, Any]:
        if self.fail_admin_confirm:
            raise BookingConfirmError("cannot confirm", 409)
        self.admin_confirmed.append(booking_id)
        return {
            "id": booking_id,
            "status": "CONFIRMED",
            "property_id": "prop-123",
            "period_start": "2026-06-01",
            "period_end": "2026-06-05",
            "guests": 2,
            "price": "250.00",
            "payment_reference": "ADMIN-ABCD1234",
            "rejection_reason": None,
        }

    async def admin_reject(self, booking_id: str, reason: str) -> dict[str, Any]:
        if self.fail_admin_reject:
            raise BookingRejectError("cannot reject", 409)
        self.admin_rejected.append((booking_id, reason))
        return {
            "id": booking_id,
            "status": "REJECTED",
            "property_id": "prop-123",
            "period_start": "2026-06-01",
            "period_end": "2026-06-05",
            "rejection_reason": reason,
            "payment_reference": None,
        }


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
        self.published: list[Any] = []

    async def publish(self, event: Any) -> None:
        if self.fail_publish:
            raise NotificationPublishError("sqs down")
        self.published.append(event)
