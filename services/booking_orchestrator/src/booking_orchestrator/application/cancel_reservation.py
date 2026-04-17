"""Cancel reservation saga.

Steps:
1. GET booking — verify it exists and is in a cancellable state.
2. POST cancel to booking service.
3. Publish BOOKING_CANCELLED event — best-effort, failure is logged.
"""

import logging
from typing import Any

from booking_orchestrator.application.commands import CancelReservationCommand
from booking_orchestrator.application.ports import BookingClient, NotificationPublisher
from booking_orchestrator.domain.events import BookingCancelledEvent
from booking_orchestrator.domain.exceptions import (
    BookingNotFoundError,
    NotificationPublishError,
    ReservationFailedError,
)

logger = logging.getLogger(__name__)

_CANCELLABLE_STATUSES = {"PENDING", "APPROVED", "CONFIRMED"}


class CancelReservationUseCase:
    def __init__(
        self,
        booking_client: BookingClient,
        publisher: NotificationPublisher,
    ) -> None:
        self._booking = booking_client
        self._publisher = publisher

    async def execute(self, command: CancelReservationCommand) -> dict[str, Any]:
        # Step 1: fetch the booking.
        try:
            booking = await self._booking.get(command.booking_id)
        except BookingNotFoundError:
            raise

        current_status = booking.get("status", "")
        if current_status not in _CANCELLABLE_STATUSES:
            raise ReservationFailedError("booking_not_cancellable")

        # Step 2: cancel in booking service.
        await self._booking.cancel(command.booking_id, command.user_id)

        # Step 3: publish notification event (best-effort).
        event = BookingCancelledEvent(
            booking_id=command.booking_id,
            property_id=booking["property_id"],
            user_id=command.user_id,
            user_email=command.user_email,
            period_start=booking["period_start"],
            period_end=booking["period_end"],
            cancelled_from_status=current_status,
        )
        try:
            await self._publisher.publish(event)
        except NotificationPublishError:
            logger.exception(
                "notification publish failed for booking %s cancellation",
                command.booking_id,
            )

        return {"booking_id": command.booking_id, "status": "CANCELED"}
