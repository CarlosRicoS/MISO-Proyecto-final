"""Admin reject reservation saga.

Steps:
1. GET booking — verify it exists and is PENDING.
2. POST admin-reject to booking service (PENDING → REJECTED with reason).
3. Publish BOOKING_REJECTED event — best-effort.

Known limitation: property lock is NOT released after rejection because
poc_properties has no unlock endpoint. This is logged as a warning.
"""

import logging
from typing import Any

from booking_orchestrator.application.commands import AdminRejectReservationCommand
from booking_orchestrator.application.ports import BookingClient, NotificationPublisher
from booking_orchestrator.domain.events import BookingRejectedEvent
from booking_orchestrator.domain.exceptions import (
    BookingNotFoundError,
    BookingRejectError,
    NotificationPublishError,
    ReservationFailedError,
)

logger = logging.getLogger(__name__)


class AdminRejectReservationUseCase:
    def __init__(
        self,
        booking_client: BookingClient,
        publisher: NotificationPublisher,
    ) -> None:
        self._booking = booking_client
        self._publisher = publisher

    async def execute(self, command: AdminRejectReservationCommand) -> dict[str, Any]:
        # Step 1: fetch the booking — raises BookingNotFoundError on 404.
        try:
            booking = await self._booking.get(command.booking_id)
        except BookingNotFoundError:
            raise

        if booking.get("status") != "PENDING":
            raise ReservationFailedError("booking_not_pending")

        # Step 2: admin-reject in booking service.
        try:
            updated = await self._booking.admin_reject(command.booking_id, command.reason)
        except BookingRejectError as exc:
            raise ReservationFailedError(exc.detail) from exc

        # NOTE: property lock is NOT released — poc_properties has no unlock endpoint.
        logger.warning(
            "booking %s rejected — property %s lock NOT released (no unlock endpoint)",
            command.booking_id,
            booking.get("property_id"),
        )

        # Step 3: publish notification (best-effort).
        event = BookingRejectedEvent(
            booking_id=command.booking_id,
            property_id=booking["property_id"],
            user_id=command.user_id,
            user_email=command.user_email,
            period_start=booking["period_start"],
            period_end=booking["period_end"],
            rejection_reason=command.reason,
        )
        try:
            await self._publisher.publish(event)
        except NotificationPublishError:
            logger.exception(
                "notification publish failed for rejected booking %s",
                command.booking_id,
            )

        return updated
