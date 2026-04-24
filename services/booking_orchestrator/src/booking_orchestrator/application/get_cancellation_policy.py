"""Get cancellation policy use case.

Fetches the booking from the booking service, computes the cancellation
policy using the pure domain function, and returns a dict suitable for
serialization by the controller.
"""

from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from booking_orchestrator.application.commands import GetCancellationPolicyCommand
from booking_orchestrator.application.ports import BookingClient
from booking_orchestrator.domain.cancellation_policy import compute_cancellation_policy


class GetCancellationPolicyUseCase:
    """Fetch a booking and compute its cancellation policy.

    Delegates to the pure domain function ``compute_cancellation_policy``
    after retrieving the booking from the booking service. Returns a dict
    ready for JSON serialization by the controller.
    """

    def __init__(self, booking_client: BookingClient) -> None:
        self._booking = booking_client

    async def execute(self, command: GetCancellationPolicyCommand) -> dict[str, Any]:
        booking = await self._booking.get(command.booking_id)

        policy = compute_cancellation_policy(
            period_start=booking["period_start"],
            price=Decimal(str(booking["price"])),
            payment_reference=booking.get("payment_reference"),
            now=datetime.now(UTC),
        )

        return {
            "booking_id": command.booking_id,
            "is_free_cancellation": policy.is_free_cancellation,
            "refund_amount": str(policy.refund_amount),
            "penalty_amount": str(policy.penalty_amount),
            "cancellation_deadline": policy.cancellation_deadline.isoformat(),
        }
