"""Pure domain function for computing cancellation policy.

Rules (applied in order):
1. If payment_reference is None → refund=0, penalty=0, is_free=True.
2. If now < period_start - 24h → free cancellation (full refund).
3. Otherwise → 50% penalty (50% refund).

cancellation_deadline is always period_start_midnight_utc - 24h.
"""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal

FREE_CANCELLATION_HOURS = 24
PENALTY_FRACTION = Decimal("0.5")


@dataclass(frozen=True)
class CancellationPolicy:
    is_free_cancellation: bool
    refund_amount: Decimal
    penalty_amount: Decimal
    cancellation_deadline: datetime


def compute_cancellation_policy(
    period_start: str,
    price: Decimal,
    payment_reference: str | None,
    now: datetime,
) -> CancellationPolicy:
    """Compute the cancellation policy for a booking.

    Args:
        period_start: ISO date string (YYYY-MM-DD) of check-in.
        price: Total booking price.
        payment_reference: Payment reference if payment was made, None otherwise.
        now: Current time (timezone-aware, UTC).

    Returns:
        CancellationPolicy with refund/penalty amounts and deadline.
    """
    start_dt = datetime.fromisoformat(period_start).replace(tzinfo=UTC)
    deadline = start_dt - timedelta(hours=FREE_CANCELLATION_HOURS)
    is_free = now < deadline

    if payment_reference is None:
        return CancellationPolicy(
            is_free_cancellation=True,
            refund_amount=Decimal("0.00"),
            penalty_amount=Decimal("0.00"),
            cancellation_deadline=deadline,
        )

    if is_free:
        return CancellationPolicy(
            is_free_cancellation=True,
            refund_amount=price,
            penalty_amount=Decimal("0.00"),
            cancellation_deadline=deadline,
        )

    penalty = (price * PENALTY_FRACTION).quantize(Decimal("0.01"))
    return CancellationPolicy(
        is_free_cancellation=False,
        refund_amount=price - penalty,
        penalty_amount=penalty,
        cancellation_deadline=deadline,
    )
