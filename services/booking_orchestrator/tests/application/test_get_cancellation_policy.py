"""Tests for GetCancellationPolicyUseCase."""

import pytest

from booking_orchestrator.application.commands import GetCancellationPolicyCommand
from booking_orchestrator.application.get_cancellation_policy import (
    GetCancellationPolicyUseCase,
)
from booking_orchestrator.domain.exceptions import BookingNotFoundError
from tests.application.fakes import FakeBookingClient


def _make_command(booking_id: str = "booking-xyz") -> GetCancellationPolicyCommand:
    return GetCancellationPolicyCommand(booking_id=booking_id)


async def test_happy_path_returns_policy_dict():
    booking = FakeBookingClient(booking_status="CONFIRMED")
    uc = GetCancellationPolicyUseCase(booking_client=booking)

    result = await uc.execute(_make_command())

    assert result["booking_id"] == "booking-xyz"
    assert "is_free_cancellation" in result
    assert "refund_amount" in result
    assert "penalty_amount" in result
    assert "cancellation_deadline" in result
    # FakeBookingClient returns period_start="2026-06-01" and price="250.00"
    # with no payment_reference → refund=0, penalty=0
    assert result["refund_amount"] == "0.00"
    assert result["penalty_amount"] == "0.00"
    assert result["is_free_cancellation"] is True


async def test_happy_path_with_payment_reference():
    """When booking has payment_reference and is well before deadline → full refund."""
    booking = FakeBookingClient(booking_status="CONFIRMED")

    # Patch get to return a booking with payment_reference set
    original_get = booking.get

    async def get_with_payment(booking_id):
        data = await original_get(booking_id)
        data["payment_reference"] = "stripe-ref-abc"
        return data

    booking.get = get_with_payment
    uc = GetCancellationPolicyUseCase(booking_client=booking)

    result = await uc.execute(_make_command())

    assert result["booking_id"] == "booking-xyz"
    # period_start is 2026-06-01, well in the future → free cancellation
    assert result["is_free_cancellation"] is True
    assert result["refund_amount"] == "250.00"
    assert result["penalty_amount"] == "0.00"


async def test_booking_not_found_raises():
    booking = FakeBookingClient(fail_get=True)
    uc = GetCancellationPolicyUseCase(booking_client=booking)

    with pytest.raises(BookingNotFoundError):
        await uc.execute(_make_command())


async def test_booking_id_passed_to_client():
    booking = FakeBookingClient()
    uc = GetCancellationPolicyUseCase(booking_client=booking)

    await uc.execute(_make_command("my-booking-id"))

    assert "my-booking-id" in booking.got
