"""Cancel reservation saga.

Steps:
1. GET booking — verify it exists and is in a cancellable state.
2. POST cancel to booking service.
3. Compute cancellation policy for refund/penalty amounts.
4. Unlock property in poc_properties (best-effort).
5. If payment_reference present, publish CANCEL to billing queue (best-effort).
6. Publish BOOKING_CANCELLED event with refund info (best-effort).
"""

import logging
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from booking_orchestrator.application.commands import CancelReservationCommand
from booking_orchestrator.application.ports import (
    BillingPublisher,
    BookingClient,
    NotificationPublisher,
    PropertyClient,
)
from booking_orchestrator.domain.cancellation_policy import compute_cancellation_policy
from booking_orchestrator.domain.events import BookingCancelledEvent
from booking_orchestrator.domain.exceptions import (
    BillingPublishError,
    BookingNotFoundError,
    NotificationPublishError,
    PropertyLockError,
    ReservationFailedError,
)

logger = logging.getLogger(__name__)

_CANCELLABLE_STATUSES = {"PENDING", "APPROVED", "CONFIRMED"}


class CancelReservationUseCase:
    def __init__(
        self,
        booking_client: BookingClient,
        publisher: NotificationPublisher,
        property_client: PropertyClient,
        billing_publisher: BillingPublisher,
    ) -> None:
        self._booking = booking_client
        self._publisher = publisher
        self._property = property_client
        self._billing = billing_publisher

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

        # Step 3: compute cancellation policy.
        policy = compute_cancellation_policy(
            period_start=booking["period_start"],
            price=Decimal(str(booking["price"])),
            payment_reference=booking.get("payment_reference"),
            now=datetime.now(UTC),
        )

        # Step 4: unlock property (best-effort).
        try:
            await self._property.unlock(
                property_id=booking["property_id"],
                period_start=booking["period_start"],
                period_end=booking["period_end"],
            )
        except PropertyLockError:
            logger.exception(
                "property unlock failed for booking %s — booking is already CANCELED",
                command.booking_id,
            )

        # Step 5: publish billing CANCEL if payment was made (best-effort).
        if booking.get("payment_reference"):
            try:
                await self._billing.publish_cancel(
                    booking_id=command.booking_id,
                    reason="user_cancellation",
                )
            except BillingPublishError:
                logger.exception(
                    "billing cancel publish failed for booking %s",
                    command.booking_id,
                )

        # Step 6: publish notification event (best-effort).
        event = BookingCancelledEvent(
            booking_id=command.booking_id,
            property_id=booking["property_id"],
            user_id=command.user_id,
            user_email=command.user_email,
            period_start=booking["period_start"],
            period_end=booking["period_end"],
            cancelled_from_status=current_status,
            refund_amount=policy.refund_amount,
            penalty_amount=policy.penalty_amount,
        )
        try:
            await self._publisher.publish(event)
        except NotificationPublishError:
            logger.exception(
                "notification publish failed for booking %s cancellation",
                command.booking_id,
            )

        return {"booking_id": command.booking_id, "status": "CANCELED"}
