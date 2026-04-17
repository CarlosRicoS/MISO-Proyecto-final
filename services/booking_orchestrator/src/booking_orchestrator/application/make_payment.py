"""Make payment saga — processes payment for an APPROVED booking via Stripe.

Steps:
1. GET booking — verify it exists and is APPROVED.
2. Stripe create payment (synchronous, gets referencePaymentId).
3. Stripe confirm payment (synchronous).
4. Update booking payment state (APPROVED → CONFIRMED with payment reference).
5. Publish billing CREATE command (best-effort, async).
6. Publish PAYMENT_CONFIRMED notification (best-effort, async).

Compensation:
- If step 3 fails: cancel Stripe payment, raise.
- If step 4 fails: cancel Stripe payment, raise.
- Steps 5–6 are best-effort — failures are logged, not raised.
"""

import logging
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from booking_orchestrator.application.commands import MakePaymentCommand
from booking_orchestrator.application.ports import (
    BillingPublisher,
    BookingClient,
    NotificationPublisher,
    StripeClient,
)
from booking_orchestrator.domain.events import PaymentConfirmedEvent
from booking_orchestrator.domain.exceptions import (
    BillingPublishError,
    BookingNotFoundError,
    BookingUpdatePaymentError,
    NotificationPublishError,
    ReservationFailedError,
    StripePaymentError,
)

logger = logging.getLogger(__name__)


class MakePaymentUseCase:
    def __init__(
        self,
        booking_client: BookingClient,
        stripe_client: StripeClient,
        billing_publisher: BillingPublisher,
        notification_publisher: NotificationPublisher,
    ) -> None:
        self._booking = booking_client
        self._stripe = stripe_client
        self._billing = billing_publisher
        self._notifications = notification_publisher

    async def execute(self, command: MakePaymentCommand) -> dict[str, Any]:
        # Step 1: fetch booking and verify it is APPROVED.
        try:
            booking = await self._booking.get(command.booking_id)
        except BookingNotFoundError:
            raise

        if booking.get("status") != "APPROVED":
            raise ReservationFailedError("booking_not_approved")

        amount = Decimal(str(booking["price"]))
        transaction_id = command.booking_id

        # Step 2: Stripe create payment.
        try:
            reference_payment_id = await self._stripe.create_payment(
                transaction_id=transaction_id,
                currency=command.currency,
                payment_method_type=command.payment_method_type,
                amount=amount,
            )
        except StripePaymentError as exc:
            raise ReservationFailedError("stripe_create_failed") from exc

        # Step 3: Stripe confirm payment.
        try:
            await self._stripe.confirm_payment(reference_payment_id, transaction_id)
        except StripePaymentError as exc:
            # Compensate: cancel the created payment.
            await self._compensate_stripe(reference_payment_id, transaction_id)
            raise ReservationFailedError("stripe_confirm_failed") from exc

        # Step 4: Update booking payment state (APPROVED → CONFIRMED).
        try:
            updated = await self._booking.update_payment_state(
                command.booking_id, reference_payment_id,
            )
        except BookingUpdatePaymentError as exc:
            # Compensate: cancel the Stripe payment.
            await self._compensate_stripe(reference_payment_id, transaction_id)
            raise ReservationFailedError("booking_update_failed") from exc

        # Step 5: Publish billing CREATE (best-effort).
        try:
            await self._billing.publish_create(
                booking_id=command.booking_id,
                payment_reference=reference_payment_id,
                payment_date=datetime.now(UTC).isoformat(),
                admin_group_id=booking.get("admin_group_id", ""),
                value=amount,
            )
        except BillingPublishError:
            logger.exception(
                "billing publish failed for booking %s — payment was successful",
                command.booking_id,
            )

        # Step 6: Publish notification (best-effort).
        event = PaymentConfirmedEvent(
            booking_id=command.booking_id,
            property_id=booking["property_id"],
            user_id=command.user_id,
            user_email=command.user_email,
            period_start=booking["period_start"],
            period_end=booking["period_end"],
            guests=booking.get("guests", 1),
            price=amount,
            payment_reference=reference_payment_id,
        )
        try:
            await self._notifications.publish(event)
        except NotificationPublishError:
            logger.exception(
                "notification publish failed for payment on booking %s",
                command.booking_id,
            )

        return updated

    async def _compensate_stripe(self, reference_payment_id: str, transaction_id: str) -> None:
        """Best-effort cancellation of a Stripe payment during compensation."""
        try:
            await self._stripe.cancel_payment(reference_payment_id, transaction_id)
        except StripePaymentError:
            logger.exception(
                "stripe cancel compensation failed for payment %s",
                reference_payment_id,
            )
