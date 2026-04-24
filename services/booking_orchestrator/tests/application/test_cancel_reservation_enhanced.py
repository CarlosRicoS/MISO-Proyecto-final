"""Tests for the enhanced CancelReservationUseCase — unlock, billing cancel, refund info.

The original test_cancel_reservation.py covers basic happy path, status guards,
notification failure. This file focuses on the new cancel-policy features:
property unlock, billing cancel, and refund/penalty amounts in the published event.
"""

from decimal import Decimal

import pytest

from booking_orchestrator.application.cancel_reservation import CancelReservationUseCase
from booking_orchestrator.application.commands import CancelReservationCommand
from booking_orchestrator.domain.exceptions import BookingNotFoundError, ReservationFailedError
from tests.application.fakes import (
    FakeBillingPublisher,
    FakeBookingClient,
    FakePropertyClient,
    FakePublisher,
)


def _make_command(**overrides) -> CancelReservationCommand:
    defaults = dict(
        booking_id="booking-xyz",
        user_id="user-uuid",
        user_email="traveler@example.com",
    )
    defaults.update(overrides)
    return CancelReservationCommand(**defaults)


def _make_use_case(booking=None, publisher=None, property_client=None, billing_publisher=None):
    return CancelReservationUseCase(
        booking_client=booking or FakeBookingClient(),
        publisher=publisher or FakePublisher(),
        property_client=property_client or FakePropertyClient(),
        billing_publisher=billing_publisher or FakeBillingPublisher(),
    )


# ---- Unlock is called with correct args -------------------------------------

async def test_unlock_called_with_correct_args():
    booking = FakeBookingClient(booking_status="CONFIRMED")
    prop = FakePropertyClient()
    uc = _make_use_case(booking, property_client=prop)

    await uc.execute(_make_command())

    assert len(prop.unlocked) == 1
    property_id, period_start, period_end = prop.unlocked[0]
    assert property_id == "prop-123"
    assert period_start == "2026-06-01"
    assert period_end == "2026-06-05"


# ---- Billing cancel is called when payment_reference is set ------------------

async def test_billing_cancel_called_when_payment_reference_present():
    booking = FakeBookingClient(booking_status="CONFIRMED")
    billing = FakeBillingPublisher()

    # Patch get to return booking with payment_reference
    original_get = booking.get

    async def get_with_payment(booking_id):
        data = await original_get(booking_id)
        data["payment_reference"] = "stripe-ref-abc"
        return data

    booking.get = get_with_payment
    uc = _make_use_case(booking, billing_publisher=billing)

    await uc.execute(_make_command())

    assert len(billing.cancelled) == 1
    assert billing.cancelled[0]["booking_id"] == "booking-xyz"
    assert billing.cancelled[0]["reason"] == "user_cancellation"


# ---- Billing cancel is NOT called when payment_reference is None -------------

async def test_billing_cancel_not_called_when_no_payment_reference():
    booking = FakeBookingClient(booking_status="PENDING")
    billing = FakeBillingPublisher()
    uc = _make_use_case(booking, billing_publisher=billing)

    await uc.execute(_make_command())

    # FakeBookingClient.get() returns no payment_reference key by default
    assert len(billing.cancelled) == 0


# ---- Published event contains correct refund and penalty amounts -------------

async def test_event_contains_refund_and_penalty_amounts_no_payment():
    """No payment_reference → refund=0, penalty=0."""
    booking = FakeBookingClient(booking_status="PENDING")
    publisher = FakePublisher()
    uc = _make_use_case(booking, publisher)

    await uc.execute(_make_command())

    event = publisher.published[0]
    assert event.refund_amount == Decimal("0.00")
    assert event.penalty_amount == Decimal("0.00")


async def test_event_contains_full_refund_when_free_cancellation():
    """payment_reference set + well before deadline → full refund."""
    booking = FakeBookingClient(booking_status="CONFIRMED")
    publisher = FakePublisher()
    original_get = booking.get

    async def get_with_payment(booking_id):
        data = await original_get(booking_id)
        data["payment_reference"] = "stripe-ref-abc"
        return data

    booking.get = get_with_payment
    uc = _make_use_case(booking, publisher)

    await uc.execute(_make_command())

    event = publisher.published[0]
    # period_start=2026-06-01, well in the future → free cancellation
    assert event.refund_amount == Decimal("250.00")
    assert event.penalty_amount == Decimal("0.00")


# ---- Unlock failure doesn't prevent cancellation (best-effort) ---------------

async def test_unlock_failure_does_not_block_cancel():
    booking = FakeBookingClient(booking_status="CONFIRMED")
    prop = FakePropertyClient(fail_unlock=True)
    publisher = FakePublisher()
    uc = _make_use_case(booking, publisher, property_client=prop)

    result = await uc.execute(_make_command())

    assert result["status"] == "CANCELED"
    assert len(publisher.published) == 1  # event still published


# ---- Billing failure doesn't prevent cancellation (best-effort) --------------

async def test_billing_failure_does_not_block_cancel():
    booking = FakeBookingClient(booking_status="CONFIRMED")
    billing = FakeBillingPublisher(fail_publish=True)
    publisher = FakePublisher()
    original_get = booking.get

    async def get_with_payment(booking_id):
        data = await original_get(booking_id)
        data["payment_reference"] = "stripe-ref-abc"
        return data

    booking.get = get_with_payment
    uc = _make_use_case(booking, publisher, billing_publisher=billing)

    result = await uc.execute(_make_command())

    assert result["status"] == "CANCELED"
    assert len(publisher.published) == 1  # notification event still published


# ---- Terminal states still raise correctly -----------------------------------

async def test_canceled_booking_raises():
    booking = FakeBookingClient(booking_status="CANCELED")
    uc = _make_use_case(booking)

    with pytest.raises(ReservationFailedError) as exc_info:
        await uc.execute(_make_command())
    assert exc_info.value.reason == "booking_not_cancellable"


async def test_rejected_booking_raises():
    booking = FakeBookingClient(booking_status="REJECTED")
    uc = _make_use_case(booking)

    with pytest.raises(ReservationFailedError):
        await uc.execute(_make_command())
