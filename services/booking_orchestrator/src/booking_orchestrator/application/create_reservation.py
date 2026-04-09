"""Create reservation saga — the heart of the booking orchestrator.

Implements compensation option (c): create booking first (PENDING), then lock the property.
If the lock fails, cancel the booking so state stays consistent.
Notification publishing is best-effort — failure is logged but does not fail the request.
"""

import logging
from decimal import Decimal
from typing import Any

from booking_orchestrator.application.commands import CreateReservationCommand
from booking_orchestrator.application.ports import (
    BookingClient,
    NotificationPublisher,
    PropertyClient,
)
from booking_orchestrator.domain.events import BookingCreatedEvent
from booking_orchestrator.domain.exceptions import (
    BookingCreateError,
    NotificationPublishError,
    PropertyLockError,
    ReservationFailedError,
)

logger = logging.getLogger(__name__)


class CreateReservationUseCase:
    def __init__(
        self,
        booking_client: BookingClient,
        property_client: PropertyClient,
        publisher: NotificationPublisher,
    ) -> None:
        self._booking = booking_client
        self._property = property_client
        self._publisher = publisher

    async def execute(self, command: CreateReservationCommand) -> dict[str, Any]:
        # Step 1: create booking in PENDING (booking service enforces the initial state).
        try:
            booking = await self._booking.create(command)
        except BookingCreateError:
            raise

        booking_id = booking["id"]

        # Step 2: lock the property. On failure, compensate by cancelling the booking.
        try:
            await self._property.lock(
                property_id=command.property_id,
                period_start=command.period_start,
                period_end=command.period_end,
            )
        except PropertyLockError as exc:
            logger.warning(
                "property lock failed, compensating booking %s: %s", booking_id, exc.detail
            )
            try:
                await self._booking.cancel(booking_id, command.user_id)
            except Exception:
                # Compensation failure is logged loudly; the booking remains PENDING.
                # This is the "orphan PENDING" case — an operator can cancel it manually.
                logger.exception(
                    "compensation cancel failed for booking %s — manual cleanup required",
                    booking_id,
                )
            raise ReservationFailedError("property_unavailable") from exc

        # Step 3: publish notification event (best-effort).
        event = BookingCreatedEvent(
            booking_id=booking_id,
            property_id=command.property_id,
            user_id=command.user_id,
            user_email=command.user_email,
            period_start=command.period_start,
            period_end=command.period_end,
            guests=command.guests,
            price=Decimal(str(booking.get("price", command.price))),
            status=booking.get("status", "PENDING"),
        )
        try:
            await self._publisher.publish(event)
        except NotificationPublishError:
            logger.exception(
                "notification publish failed for booking %s — email must be replayed manually",
                booking_id,
            )

        return booking
