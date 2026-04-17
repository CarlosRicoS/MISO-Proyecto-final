from decimal import Decimal

import pytest

from booking_orchestrator.application.commands import MakePaymentCommand
from booking_orchestrator.application.make_payment import MakePaymentUseCase
from booking_orchestrator.domain.events import PaymentConfirmedEvent
from booking_orchestrator.domain.exceptions import BookingNotFoundError, ReservationFailedError
from tests.application.fakes import (
    FakeBillingPublisher,
    FakeBookingClient,
    FakePublisher,
    FakeStripeClient,
)


def _make_command(**overrides) -> MakePaymentCommand:
    defaults = dict(
        booking_id="booking-xyz",
        user_id="user-uuid",
        user_email="user@example.com",
        currency="USD",
        payment_method_type="CREDIT_CARD",
    )
    defaults.update(overrides)
    return MakePaymentCommand(**defaults)


def _make_use_case(
    booking: FakeBookingClient | None = None,
    stripe: FakeStripeClient | None = None,
    billing: FakeBillingPublisher | None = None,
    pub: FakePublisher | None = None,
):
    return MakePaymentUseCase(
        booking_client=booking or FakeBookingClient(booking_status="APPROVED"),
        stripe_client=stripe or FakeStripeClient(),
        billing_publisher=billing or FakeBillingPublisher(),
        notification_publisher=pub or FakePublisher(),
    )


async def test_happy_path_returns_confirmed_booking():
    booking = FakeBookingClient(booking_status="APPROVED")
    stripe = FakeStripeClient()
    uc = _make_use_case(booking=booking, stripe=stripe)

    result = await uc.execute(_make_command())

    assert result["status"] == "CONFIRMED"
    assert len(stripe.created) == 1
    assert len(stripe.confirmed) == 1
    assert len(booking.payment_updated) == 1


async def test_happy_path_calls_stripe_with_correct_args():
    booking = FakeBookingClient(booking_status="APPROVED")
    stripe = FakeStripeClient()
    uc = _make_use_case(booking=booking, stripe=stripe)

    await uc.execute(_make_command())

    tid, currency, method, amount = stripe.created[0]
    assert tid == "booking-xyz"
    assert currency == "USD"
    assert method == "CREDIT_CARD"
    assert amount == Decimal("250.00")


async def test_happy_path_publishes_billing_create():
    billing = FakeBillingPublisher()
    uc = _make_use_case(billing=billing)

    await uc.execute(_make_command())

    assert len(billing.published) == 1
    msg = billing.published[0]
    assert msg["booking_id"] == "booking-xyz"
    assert msg["value"] == Decimal("250.00")


async def test_happy_path_publishes_payment_confirmed_event():
    pub = FakePublisher()
    uc = _make_use_case(pub=pub)

    await uc.execute(_make_command())

    assert len(pub.published) == 1
    assert isinstance(pub.published[0], PaymentConfirmedEvent)
    assert pub.published[0].user_email == "user@example.com"
    assert pub.published[0].booking_id == "booking-xyz"


async def test_booking_not_found_raises():
    booking = FakeBookingClient(fail_get=True)
    uc = _make_use_case(booking=booking)

    with pytest.raises(BookingNotFoundError):
        await uc.execute(_make_command())


async def test_booking_not_approved_raises():
    booking = FakeBookingClient(booking_status="PENDING")
    uc = _make_use_case(booking=booking)

    with pytest.raises(ReservationFailedError) as exc_info:
        await uc.execute(_make_command())

    assert exc_info.value.reason == "booking_not_approved"


async def test_stripe_create_failure_raises_without_compensation():
    stripe = FakeStripeClient(fail_create=True)
    uc = _make_use_case(stripe=stripe)

    with pytest.raises(ReservationFailedError) as exc_info:
        await uc.execute(_make_command())

    assert exc_info.value.reason == "stripe_create_failed"
    # No cancel compensation needed — payment was never created
    assert len(stripe.cancelled) == 0


async def test_stripe_confirm_failure_cancels_payment_and_raises():
    stripe = FakeStripeClient(fail_confirm=True)
    uc = _make_use_case(stripe=stripe)

    with pytest.raises(ReservationFailedError) as exc_info:
        await uc.execute(_make_command())

    assert exc_info.value.reason == "stripe_confirm_failed"
    # Cancel compensation should have been called
    assert len(stripe.cancelled) == 1


async def test_booking_update_failure_cancels_stripe_and_raises():
    booking = FakeBookingClient(booking_status="APPROVED", fail_update_payment=True)
    stripe = FakeStripeClient()
    uc = _make_use_case(booking=booking, stripe=stripe)

    with pytest.raises(ReservationFailedError) as exc_info:
        await uc.execute(_make_command())

    assert exc_info.value.reason == "booking_update_failed"
    # Cancel compensation for the Stripe payment
    assert len(stripe.cancelled) == 1


async def test_billing_publish_failure_is_swallowed():
    billing = FakeBillingPublisher(fail_publish=True)
    uc = _make_use_case(billing=billing)

    # Should not raise despite billing publish failure
    result = await uc.execute(_make_command())
    assert result["status"] == "CONFIRMED"


async def test_notification_publish_failure_is_swallowed():
    pub = FakePublisher(fail_publish=True)
    uc = _make_use_case(pub=pub)

    # Should not raise despite notification publish failure
    result = await uc.execute(_make_command())
    assert result["status"] == "CONFIRMED"


async def test_stripe_cancel_failure_during_compensation_is_logged():
    """If confirm fails and cancel also fails, the saga still raises the original error."""
    stripe = FakeStripeClient(fail_confirm=True, fail_cancel=True)
    uc = _make_use_case(stripe=stripe)

    with pytest.raises(ReservationFailedError) as exc_info:
        await uc.execute(_make_command())

    assert exc_info.value.reason == "stripe_confirm_failed"
