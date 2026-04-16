"""Change-dates reservation saga.

Steps:
1. GET booking — verify it exists and is CONFIRMED.
2. Lock the new dates in the property service.
   On lock failure: raise ReservationFailedError("property_unavailable").
   (The old lock is NOT released — accepted trade-off per design decision.)
3. PATCH booking dates — apply the new period and price.
   On failure after lock: log the orphan lock and raise ReservationFailedError.
4. Publish BOOKING_DATES_CHANGED event — best-effort, failure is logged.
"""

import logging
from decimal import Decimal
from typing import Any

from booking_orchestrator.application.commands import ChangeDatesReservationCommand
from booking_orchestrator.application.ports import (
    BookingClient,
    NotificationPublisher,
    PropertyClient,
)
from booking_orchestrator.domain.events import BookingDatesChangedEvent
from booking_orchestrator.domain.exceptions import (
    BookingChangeDatesError,
    BookingNotFoundError,
    NotificationPublishError,
    PropertyLockError,
    ReservationFailedError,
)

logger = logging.getLogger(__name__)


class ChangeDatesReservationUseCase:
    def __init__(
        self,
        booking_client: BookingClient,
        property_client: PropertyClient,
        publisher: NotificationPublisher,
    ) -> None:
        self._booking = booking_client
        self._property = property_client
        self._publisher = publisher

    async def execute(self, command: ChangeDatesReservationCommand) -> dict[str, Any]:
        # Step 1: fetch the booking and validate its state.
        try:
            booking = await self._booking.get(command.booking_id)
        except BookingNotFoundError:
            raise

        if booking.get("status") != "CONFIRMED":
            raise ReservationFailedError("booking_not_confirmed")

        # Capture the old period before we update.
        old_period_start: str = booking["period_start"]
        old_period_end: str = booking["period_end"]
        property_id: str = booking["property_id"]

        # Step 2: lock the new dates.
        try:
            await self._property.lock(
                property_id=property_id,
                period_start=command.new_period_start,
                period_end=command.new_period_end,
            )
        except PropertyLockError as exc:
            raise ReservationFailedError("property_unavailable") from exc

        # Step 3: apply the date change on the booking.
        try:
            updated = await self._booking.change_dates(command)
        except BookingChangeDatesError as exc:
            # The new lock is orphaned — log loudly and surface the error.
            logger.error(
                "change_dates failed after property lock for booking %s: %s",
                command.booking_id,
                exc.detail,
            )
            raise ReservationFailedError(exc.detail) from exc

        # Step 4: publish notification event (best-effort).
        event = BookingDatesChangedEvent(
            booking_id=command.booking_id,
            property_id=property_id,
            user_id=command.user_id,
            user_email=command.user_email,
            old_period_start=old_period_start,
            old_period_end=old_period_end,
            new_period_start=command.new_period_start,
            new_period_end=command.new_period_end,
            new_price=command.new_price,
            price_difference=Decimal(str(updated.get("price_difference", "0"))),
        )
        try:
            await self._publisher.publish(event)
        except NotificationPublishError:
            logger.exception(
                "notification publish failed for booking %s date change",
                command.booking_id,
            )

        return updated
