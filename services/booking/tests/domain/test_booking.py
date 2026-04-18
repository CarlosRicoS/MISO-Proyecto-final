from datetime import date
from decimal import Decimal
from uuid import uuid4

import pytest

from booking.domain.booking import Booking, BookingStatus
from booking.domain.exceptions import (
    BookingAlreadyCancelledError,
    BookingDateChangeNotAllowedError,
    BookingValidationError,
    InvalidBookingPeriodError,
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

    def test_can_confirm_pending(self):
        booking = _make_booking()
        booking.confirm(payment_reference="PAY-123")
        assert booking.status == BookingStatus.CONFIRMED
        assert booking.payment_reference == "PAY-123"


class TestChangeDates:
    def _confirmed_booking(self) -> Booking:
        booking = _make_booking()
        booking.approve()
        booking.confirm(payment_reference="PAY-001")
        return booking

    def test_change_dates_updates_period_and_price(self):
        booking = self._confirmed_booking()
        new_period = BookingPeriod(start_date=date(2026, 7, 1), end_date=date(2026, 7, 5))
        new_price = Money(amount=Decimal("350.00"))
        booking.change_dates(new_period, new_price)
        assert booking.period == new_period
        assert booking.price == new_price
        assert booking.status == BookingStatus.CONFIRMED

    def test_change_dates_returns_positive_price_difference(self):
        booking = self._confirmed_booking()
        original_price = booking.price.amount
        new_price = Money(amount=original_price + Decimal("50.00"))
        diff = booking.change_dates(
            BookingPeriod(start_date=date(2026, 7, 1), end_date=date(2026, 7, 6)),
            new_price,
        )
        assert diff == Decimal("50.00")

    def test_change_dates_returns_negative_price_difference(self):
        booking = self._confirmed_booking()
        original_price = booking.price.amount
        new_price = Money(amount=original_price - Decimal("30.00"))
        diff = booking.change_dates(
            BookingPeriod(start_date=date(2026, 7, 1), end_date=date(2026, 7, 3)),
            new_price,
        )
        assert diff == Decimal("-30.00")

    def test_change_dates_on_pending_booking_raises(self):
        booking = _make_booking()
        with pytest.raises(BookingDateChangeNotAllowedError):
            booking.change_dates(
                BookingPeriod(start_date=date(2026, 7, 1), end_date=date(2026, 7, 5)),
                Money(amount=Decimal("200.00")),
            )

    def test_change_dates_on_approved_booking_raises(self):
        booking = _make_booking()
        booking.approve()
        with pytest.raises(BookingDateChangeNotAllowedError):
            booking.change_dates(
                BookingPeriod(start_date=date(2026, 7, 1), end_date=date(2026, 7, 5)),
                Money(amount=Decimal("200.00")),
            )

    def test_change_dates_on_canceled_booking_raises(self):
        booking = _make_booking()
        booking.cancel()
        with pytest.raises(BookingDateChangeNotAllowedError):
            booking.change_dates(
                BookingPeriod(start_date=date(2026, 7, 1), end_date=date(2026, 7, 5)),
                Money(amount=Decimal("200.00")),
            )

    def test_change_dates_on_completed_booking_raises(self):
        booking = self._confirmed_booking()
        booking.complete()
        with pytest.raises(BookingDateChangeNotAllowedError):
            booking.change_dates(
                BookingPeriod(start_date=date(2026, 7, 1), end_date=date(2026, 7, 5)),
                Money(amount=Decimal("200.00")),
            )

    def test_change_dates_with_invalid_period_raises(self):
        booking = self._confirmed_booking()
        with pytest.raises(InvalidBookingPeriodError):
            booking.change_dates(
                BookingPeriod(start_date=date(2026, 7, 5), end_date=date(2026, 7, 1)),
                Money(amount=Decimal("200.00")),
            )


class TestAdminActions:
    def test_reject_pending_booking(self):
        booking = _make_booking()
        booking.reject("Double booking")
        assert booking.status == BookingStatus.REJECTED
        assert booking.rejection_reason == "Double booking"

    def test_reject_stores_reason(self):
        booking = _make_booking()
        booking.reject("Price dispute")
        assert booking.rejection_reason == "Price dispute"

    def test_cannot_reject_approved_booking(self):
        booking = _make_booking()
        booking.approve()
        with pytest.raises(InvalidBookingStatusTransitionError):
            booking.reject("Too late")

    def test_reject_confirmed_booking(self):
        booking = _make_booking()
        booking.approve()
        booking.confirm("PAY-X")
        booking.reject("Nope")
        assert booking.status == BookingStatus.REJECTED
        assert booking.rejection_reason == "Nope"

    def test_cannot_reject_with_empty_reason(self):
        booking = _make_booking()
        with pytest.raises(BookingValidationError):
            booking.reject("")

    def test_cannot_reject_with_whitespace_reason(self):
        booking = _make_booking()
        with pytest.raises(BookingValidationError):
            booking.reject("   ")

    def test_rejected_is_terminal(self):
        booking = _make_booking()
        booking.reject("Reason")
        with pytest.raises(InvalidBookingStatusTransitionError):
            booking.cancel()

    def test_admin_confirm_traverses_pending_to_confirmed(self):
        booking = _make_booking()
        booking.approve()
        booking.confirm("ADMIN-ABCD1234")
        assert booking.status == BookingStatus.CONFIRMED
        assert booking.payment_reference == "ADMIN-ABCD1234"
        assert booking.rejection_reason is None

    def test_new_booking_has_no_rejection_reason(self):
        booking = _make_booking()
        assert booking.rejection_reason is None
