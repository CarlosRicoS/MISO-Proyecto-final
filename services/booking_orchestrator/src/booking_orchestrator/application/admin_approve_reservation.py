"""Admin approve reservation saga.

Steps:
1. GET booking — verify it exists and is PENDING.
2. POST admin-approve to booking service (PENDING → APPROVED).
3. Publish BOOKING_APPROVED event — best-effort, failure is logged.

No compensation needed: if step 2 fails the booking remains PENDING.
"""

import logging
from decimal import Decimal
from typing import Any

from booking_orchestrator.application.commands import AdminApproveReservationCommand
from booking_orchestrator.application.ports import BookingClient, NotificationPublisher
from booking_orchestrator.domain.events import BookingApprovedEvent
from booking_orchestrator.domain.exceptions import (
    BookingApproveError,
    BookingNotFoundError,
    NotificationPublishError,
    ReservationFailedError,
)

logger = logging.getLogger(__name__)


class AdminApproveReservationUseCase:
    def __init__(
        self,
        booking_client: BookingClient,
        publisher: NotificationPublisher,
    ) -> None:
        self._booking = booking_client
        self._publisher = publisher

    async def execute(self, command: AdminApproveReservationCommand) -> dict[str, Any]:
        # Step 1: fetch the booking — raises BookingNotFoundError on 404.
        try:
            booking = await self._booking.get(command.booking_id)
        except BookingNotFoundError:
            raise

        if booking.get("status") != "PENDING":
            raise ReservationFailedError("booking_not_pending")

        # Step 2: admin-approve in booking service.
        try:
            updated = await self._booking.admin_approve(command.booking_id)
        except BookingApproveError as exc:
            raise ReservationFailedError(exc.detail) from exc

        # Step 3: publish notification event (best-effort).
        event = BookingApprovedEvent(
            booking_id=command.booking_id,
            property_id=booking["property_id"],
            user_id=command.user_id,
            user_email=command.user_email,
            period_start=booking["period_start"],
            period_end=booking["period_end"],
            guests=booking["guests"],
            price=Decimal(str(booking["price"])),
        )
        try:
            await self._publisher.publish(event)
        except NotificationPublishError:
            logger.exception(
                "notification publish failed for booking %s approval",
                command.booking_id,
            )

        return updated
