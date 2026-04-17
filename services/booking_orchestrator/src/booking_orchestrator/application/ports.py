"""Application-level ports — abstract interfaces that infrastructure adapters implement."""

from decimal import Decimal
from typing import Any, Protocol

from booking_orchestrator.application.commands import (
    ChangeDatesReservationCommand,
    CreateReservationCommand,
)
from booking_orchestrator.domain.events import (
    BookingApprovedEvent,
    BookingCancelledEvent,
    BookingConfirmedEvent,
    BookingCreatedEvent,
    BookingDatesChangedEvent,
    BookingRejectedEvent,
    PaymentConfirmedEvent,
)


class BookingClient(Protocol):
    """Port for calling the booking microservice."""

    async def create(self, command: CreateReservationCommand) -> dict[str, Any]:
        """Create a PENDING booking and return the booking payload as a dict."""
        ...

    async def cancel(self, booking_id: str, user_id: str) -> None:
        """Cancel a booking. Used for saga compensation."""
        ...

    async def get(self, booking_id: str) -> dict[str, Any]:
        """Retrieve a booking by ID. Raises BookingNotFoundError on 404."""
        ...

    async def change_dates(self, command: ChangeDatesReservationCommand) -> dict[str, Any]:
        """Change dates of a confirmed booking. Returns updated booking with price_difference."""
        ...

    async def admin_confirm(self, booking_id: str) -> dict[str, Any]:
        """Admin-confirm a PENDING booking (PENDING → CONFIRMED). Returns updated booking."""
        ...

    async def admin_reject(self, booking_id: str, reason: str) -> dict[str, Any]:
        """Admin-reject a PENDING booking (PENDING → REJECTED). Returns updated booking."""
        ...

    async def admin_approve(self, booking_id: str) -> dict[str, Any]:
        """Admin-approve a PENDING booking (PENDING → APPROVED). Returns updated booking."""
        ...

    async def update_payment_state(self, booking_id: str, payment_reference: str) -> dict[str, Any]:
        """Update booking payment state (APPROVED → CONFIRMED). Returns updated booking."""
        ...


class PropertyClient(Protocol):
    """Port for calling the poc_properties microservice."""

    async def lock(self, property_id: str, period_start: str, period_end: str) -> None:
        """Lock a property for the given ISO period. Raises PropertyLockError on failure."""
        ...


class StripeClient(Protocol):
    """Port for calling the Stripe mock payment gateway."""

    async def create_payment(
        self, transaction_id: str, currency: str, payment_method_type: str, amount: Decimal,
    ) -> str:
        """Create a payment intent. Returns the referencePaymentId."""
        ...

    async def confirm_payment(self, reference_payment_id: str, transaction_id: str) -> None:
        """Confirm a created payment."""
        ...

    async def cancel_payment(self, reference_payment_id: str, transaction_id: str) -> None:
        """Cancel a created payment (saga compensation)."""
        ...


class BillingPublisher(Protocol):
    """Port for publishing billing commands onto the billing SQS queue."""

    async def publish_create(
        self,
        booking_id: str,
        payment_reference: str,
        payment_date: str,
        admin_group_id: str,
        value: Decimal,
    ) -> None:
        """Publish a CREATE billing command. Best-effort."""
        ...


class NotificationPublisher(Protocol):
    """Port for publishing domain events onto the notifications queue."""

    async def publish(
        self,
        event: (
            BookingCreatedEvent
            | BookingApprovedEvent
            | BookingCancelledEvent
            | BookingDatesChangedEvent
            | BookingConfirmedEvent
            | BookingRejectedEvent
            | PaymentConfirmedEvent
        ),
    ) -> None:
        """Publish the event. Raises NotificationPublishError on failure."""
        ...
