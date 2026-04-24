"""Tests for the pure domain function compute_cancellation_policy()."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal

from booking_orchestrator.domain.cancellation_policy import (
    FREE_CANCELLATION_HOURS,
    PENALTY_FRACTION,
    CancellationPolicy,
    compute_cancellation_policy,
)


# ---- Helpers ----------------------------------------------------------------

PERIOD_START = "2026-06-15"
PRICE = Decimal("200.00")
PAYMENT_REF = "stripe-ref-abc123"
_START_DT = datetime(2026, 6, 15, tzinfo=UTC)
DEADLINE = _START_DT - timedelta(hours=FREE_CANCELLATION_HOURS)  # 2026-06-14 00:00 UTC


# ---- Free cancellation (>= 24 h before check-in, payment made) ---------------

def test_free_cancellation_when_well_before_deadline():
    now = DEADLINE - timedelta(hours=48)
    policy = compute_cancellation_policy(PERIOD_START, PRICE, PAYMENT_REF, now)

    assert policy.is_free_cancellation is True
    assert policy.refund_amount == PRICE
    assert policy.penalty_amount == Decimal("0.00")
    assert policy.cancellation_deadline == DEADLINE


def test_free_cancellation_one_second_before_deadline():
    now = DEADLINE - timedelta(seconds=1)
    policy = compute_cancellation_policy(PERIOD_START, PRICE, PAYMENT_REF, now)

    assert policy.is_free_cancellation is True
    assert policy.refund_amount == PRICE
    assert policy.penalty_amount == Decimal("0.00")


# ---- Penalty cancellation (< 24 h before check-in, payment made) ------------

def test_penalty_when_after_deadline():
    now = DEADLINE + timedelta(hours=6)
    policy = compute_cancellation_policy(PERIOD_START, PRICE, PAYMENT_REF, now)

    assert policy.is_free_cancellation is False
    expected_penalty = (PRICE * PENALTY_FRACTION).quantize(Decimal("0.01"))
    assert policy.penalty_amount == expected_penalty
    assert policy.refund_amount == PRICE - expected_penalty


def test_penalty_one_second_after_deadline():
    now = DEADLINE + timedelta(seconds=1)
    policy = compute_cancellation_policy(PERIOD_START, PRICE, PAYMENT_REF, now)

    assert policy.is_free_cancellation is False
    assert policy.penalty_amount == Decimal("100.00")
    assert policy.refund_amount == Decimal("100.00")


# ---- Edge case: exactly at deadline → penalty (now == deadline → not free) ----

def test_exactly_at_deadline_is_penalty():
    """now == deadline means now < deadline is False → penalty."""
    now = DEADLINE
    policy = compute_cancellation_policy(PERIOD_START, PRICE, PAYMENT_REF, now)

    assert policy.is_free_cancellation is False
    assert policy.penalty_amount == Decimal("100.00")
    assert policy.refund_amount == Decimal("100.00")


# ---- No payment → refund=0, penalty=0 regardless of timing -------------------

def test_no_payment_before_deadline():
    now = DEADLINE - timedelta(hours=48)
    policy = compute_cancellation_policy(PERIOD_START, PRICE, None, now)

    assert policy.is_free_cancellation is True
    assert policy.refund_amount == Decimal("0.00")
    assert policy.penalty_amount == Decimal("0.00")


def test_no_payment_after_deadline():
    now = DEADLINE + timedelta(hours=6)
    policy = compute_cancellation_policy(PERIOD_START, PRICE, None, now)

    assert policy.is_free_cancellation is True
    assert policy.refund_amount == Decimal("0.00")
    assert policy.penalty_amount == Decimal("0.00")


def test_no_payment_at_deadline():
    now = DEADLINE
    policy = compute_cancellation_policy(PERIOD_START, PRICE, None, now)

    assert policy.is_free_cancellation is True
    assert policy.refund_amount == Decimal("0.00")
    assert policy.penalty_amount == Decimal("0.00")


# ---- Deadline is always period_start - 24h -----------------------------------

def test_deadline_is_always_period_start_minus_24h():
    now = datetime(2026, 1, 1, tzinfo=UTC)
    policy = compute_cancellation_policy(PERIOD_START, PRICE, PAYMENT_REF, now)
    assert policy.cancellation_deadline == DEADLINE


def test_deadline_no_payment():
    now = datetime(2026, 1, 1, tzinfo=UTC)
    policy = compute_cancellation_policy(PERIOD_START, PRICE, None, now)
    assert policy.cancellation_deadline == DEADLINE


# ---- Odd-cent prices round correctly -----------------------------------------

def test_odd_price_penalty_rounds_correctly():
    """price=99.99 → penalty = 49.995 → quantized to 50.00; refund = 49.99."""
    now = DEADLINE + timedelta(hours=1)
    policy = compute_cancellation_policy(PERIOD_START, Decimal("99.99"), PAYMENT_REF, now)

    assert policy.penalty_amount == Decimal("50.00")
    assert policy.refund_amount == Decimal("49.99")


# ---- CancellationPolicy dataclass is frozen ----------------------------------

def test_policy_is_immutable():
    policy = CancellationPolicy(
        is_free_cancellation=True,
        refund_amount=Decimal("0"),
        penalty_amount=Decimal("0"),
        cancellation_deadline=DEADLINE,
    )
    import pytest
    with pytest.raises(AttributeError):
        policy.refund_amount = Decimal("999")  # type: ignore[misc]
