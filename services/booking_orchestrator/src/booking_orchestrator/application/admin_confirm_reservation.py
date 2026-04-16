"""Admin confirm reservation saga.

Steps:
1. GET booking — verify it exists and is PENDING.
2. POST admin-confirm to booking service (PENDING → APPROVED → CONFIRMED in one call).
3. Publish BOOKING_CONFIRMED event — best-effort, failure is logged not raised.

No compensation needed: if step 2 fails the booking remains PENDING. If step 2
succeeds but step 3 fails, the booking is CONFIRMED and the notification error
is logged — same best-effort contract as all other sagas.

Known limitation: confirm idempotency gap. If the booking service succeeds but
the HTTP response is lost (network timeout), a retry by the admin will see a
409 booking_not_pending error. The booking IS correctly CONFIRMED; the admin
should verify by fetching the booking.
"""

import logging
from decimal import Decimal
from typing import Any

from booking_orchestrator.application.commands import AdminConfirmReservationCommand
from booking_orchestrator.application.ports import BookingClient, NotificationPublisher
from booking_orchestrator.domain.events import BookingConfirmedEvent
from booking_orchestrator.domain.exceptions import (
    BookingConfirmError,
    BookingNotFoundError,
    NotificationPublishError,
    ReservationFailedError,
)

logger = logging.getLogger(__name__)


class AdminConfirmReservationUseCase:
    def __init__(
        self,
        booking_client: BookingClient,
        publisher: NotificationPublisher,
    ) -> None:
        self._booking = booking_client
        self._publisher = publisher

    async def execute(self, command: AdminConfirmReservationCommand) -> dict[str, Any]:
        # Step 1: fetch the booking — raises BookingNotFoundError on 404.
        try:
            booking = await self._booking.get(command.booking_id)
        except BookingNotFoundError:
            raise

        if booking.get("status") != "PENDING":
            raise ReservationFailedError("booking_not_pending")

        # Step 2: admin-confirm in booking service.
        try:
            updated = await self._booking.admin_confirm(command.booking_id)
        except BookingConfirmError as exc:
            raise ReservationFailedError(exc.detail) from exc

        # Step 3: publish notification (best-effort).
        event = BookingConfirmedEvent(
            booking_id=command.booking_id,
            property_id=booking["property_id"],
            user_id=command.user_id,
            user_email=command.user_email,
            period_start=booking["period_start"],
            period_end=booking["period_end"],
            guests=booking.get("guests", 1),
            price=Decimal(str(updated.get("price", booking.get("price", "0")))),
            payment_reference=updated.get("payment_reference", ""),
        )
        try:
            await self._publisher.publish(event)
        except NotificationPublishError:
            logger.exception(
                "notification publish failed for confirmed booking %s",
                command.booking_id,
            )

        return updated
