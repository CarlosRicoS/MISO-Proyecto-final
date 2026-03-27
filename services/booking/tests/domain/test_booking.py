from datetime import date
from decimal import Decimal
from uuid import uuid4

import pytest

from booking.domain.booking import Booking, BookingStatus
from booking.domain.exceptions import (
    BookingAlreadyCancelledError,
    BookingValidationError,
    InvalidBookingStatusTransitionError,
)
from booking.domain.value_objects import BookingPeriod, Money


def _make_booking(**overrides) -> Booking:
    defaults = {
        "property_id": uuid4(),
        "user_id": uuid4(),
        "guests": 2,
        "period": BookingPeriod(start_date=date(2026, 6, 1), end_date=date(2026, 6, 5)),
        "price": Money(amount=Decimal("250.00")),
        "admin_group_id": uuid4(),
    }
    defaults.update(overrides)
    return Booking(**defaults)


class TestCreateBooking:
    def test_creates_valid_booking(self):
        booking = _make_booking()
        assert booking.status == BookingStatus.PENDING
        assert booking.guests == 2
        assert booking.id is not None
        assert booking.payment_reference is None

    def test_rejects_zero_guests(self):
        with pytest.raises(BookingValidationError, match="at least 1"):
            _make_booking(guests=0)

    def test_rejects_negative_guests(self):
        with pytest.raises(BookingValidationError):
            _make_booking(guests=-1)


class TestBookingPeriod:
    def test_valid_period(self):
        period = BookingPeriod(start_date=date(2026, 6, 1), end_date=date(2026, 6, 5))
        assert period.nights == 4

    def test_rejects_same_dates(self):
        from booking.domain.exceptions import InvalidBookingPeriodError

        with pytest.raises(InvalidBookingPeriodError):
            BookingPeriod(start_date=date(2026, 6, 1), end_date=date(2026, 6, 1))

    def test_rejects_reversed_dates(self):
        from booking.domain.exceptions import InvalidBookingPeriodError

        with pytest.raises(InvalidBookingPeriodError):
            BookingPeriod(start_date=date(2026, 6, 5), end_date=date(2026, 6, 1))


class TestMoney:
    def test_valid_amount(self):
        money = Money(amount=Decimal("100.50"))
        assert money.amount == Decimal("100.50")

    def test_zero_is_valid(self):
        money = Money(amount=Decimal("0"))
        assert money.amount == Decimal("0")

    def test_rejects_negative(self):
        with pytest.raises(BookingValidationError):
            Money(amount=Decimal("-10"))


class TestBookingStatusTransitions:
    def test_cancel_pending(self):
        booking = _make_booking()
        booking.cancel()
        assert booking.status == BookingStatus.CANCELED

    def test_approve_pending(self):
        booking = _make_booking()
        booking.approve()
        assert booking.status == BookingStatus.APPROVED

    def test_cancel_approved(self):
        booking = _make_booking()
        booking.approve()
        booking.cancel()
        assert booking.status == BookingStatus.CANCELED

    def test_confirm_approved(self):
        booking = _make_booking()
        booking.approve()
        booking.confirm(payment_reference="PAY-123")
        assert booking.status == BookingStatus.CONFIRMED
        assert booking.payment_reference == "PAY-123"

    def test_complete_confirmed(self):
        booking = _make_booking()
        booking.approve()
        booking.confirm(payment_reference="PAY-123")
        booking.complete()
        assert booking.status == BookingStatus.COMPLETED

    def test_cannot_cancel_completed(self):
        booking = _make_booking()
        booking.approve()
        booking.confirm(payment_reference="PAY-123")
        booking.complete()
        with pytest.raises(InvalidBookingStatusTransitionError):
            booking.cancel()

    def test_cannot_cancel_twice(self):
        booking = _make_booking()
        booking.cancel()
        with pytest.raises(BookingAlreadyCancelledError):
            booking.cancel()

    def test_cannot_approve_cancelled(self):
        booking = _make_booking()
        booking.cancel()
        with pytest.raises(InvalidBookingStatusTransitionError):
            booking.approve()

    def test_cannot_confirm_pending(self):
        booking = _make_booking()
        with pytest.raises(InvalidBookingStatusTransitionError):
            booking.confirm(payment_reference="PAY-123")
