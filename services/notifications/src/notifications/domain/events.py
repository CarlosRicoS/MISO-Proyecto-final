"""Domain representation of events consumed from notifications_queue."""

from dataclasses import dataclass
from typing import Any

SUPPORTED_SCHEMA_VERSION = 1


@dataclass(frozen=True)
class BookingCreatedEvent:
    booking_id: str
    property_id: str
    period_start: str
    period_end: str
    guests: int
    price: str
    status: str
    user_id: str
    user_email: str

    @classmethod
    def from_message(cls, message: dict[str, Any]) -> "BookingCreatedEvent":
        booking = message["booking"]
        recipient = message["recipient"]
        return cls(
            booking_id=booking["id"],
            property_id=booking["property_id"],
            period_start=booking["period_start"],
            period_end=booking["period_end"],
            guests=booking["guests"],
            price=str(booking["price"]),
            status=booking["status"],
            user_id=recipient["user_id"],
            user_email=recipient["email"],
        )


@dataclass(frozen=True)
class BookingConfirmedEvent:
    booking_id: str
    property_id: str
    period_start: str
    period_end: str
    guests: int
    price: str
    payment_reference: str
    user_id: str
    user_email: str

    @classmethod
    def from_message(cls, message: dict[str, Any]) -> "BookingConfirmedEvent":
        booking = message["booking"]
        recipient = message["recipient"]
        return cls(
            booking_id=booking["id"],
            property_id=booking["property_id"],
            period_start=booking["period_start"],
            period_end=booking["period_end"],
            guests=booking["guests"],
            price=str(booking["price"]),
            payment_reference=booking["payment_reference"],
            user_id=recipient["user_id"],
            user_email=recipient["email"],
        )


@dataclass(frozen=True)
class BookingRejectedEvent:
    booking_id: str
    property_id: str
    period_start: str
    period_end: str
    rejection_reason: str
    user_id: str
    user_email: str

    @classmethod
    def from_message(cls, message: dict[str, Any]) -> "BookingRejectedEvent":
        booking = message["booking"]
        recipient = message["recipient"]
        return cls(
            booking_id=booking["id"],
            property_id=booking["property_id"],
            period_start=booking["period_start"],
            period_end=booking["period_end"],
            rejection_reason=booking["rejection_reason"],
            user_id=recipient["user_id"],
            user_email=recipient["email"],
        )


@dataclass(frozen=True)
class PaymentConfirmedEvent:
    booking_id: str
    property_id: str
    period_start: str
    period_end: str
    guests: int
    price: str
    payment_reference: str
    user_id: str
    user_email: str

    @classmethod
    def from_message(cls, message: dict[str, Any]) -> "PaymentConfirmedEvent":
        booking = message["booking"]
        recipient = message["recipient"]
        return cls(
            booking_id=booking["id"],
            property_id=booking["property_id"],
            period_start=booking["period_start"],
            period_end=booking["period_end"],
            guests=booking["guests"],
            price=str(booking["price"]),
            payment_reference=booking["payment_reference"],
            user_id=recipient["user_id"],
            user_email=recipient["email"],
        )


@dataclass(frozen=True)
class BookingApprovedEvent:
    booking_id: str
    property_id: str
    period_start: str
    period_end: str
    guests: int
    price: str
    user_id: str
    user_email: str

    @classmethod
    def from_message(cls, message: dict[str, Any]) -> "BookingApprovedEvent":
        booking = message["booking"]
        recipient = message["recipient"]
        return cls(
            booking_id=booking["id"],
            property_id=booking["property_id"],
            period_start=booking["period_start"],
            period_end=booking["period_end"],
            guests=booking["guests"],
            price=str(booking["price"]),
            user_id=recipient["user_id"],
            user_email=recipient["email"],
        )


@dataclass(frozen=True)
class BookingCancelledEvent:
    booking_id: str
    property_id: str
    period_start: str
    period_end: str
    cancelled_from_status: str
    user_id: str
    user_email: str
    refund_amount: str
    penalty_amount: str

    @classmethod
    def from_message(cls, message: dict[str, Any]) -> "BookingCancelledEvent":
        booking = message["booking"]
        recipient = message["recipient"]
        return cls(
            booking_id=booking["id"],
            property_id=booking["property_id"],
            period_start=booking["period_start"],
            period_end=booking["period_end"],
            cancelled_from_status=booking["cancelled_from_status"],
            user_id=recipient["user_id"],
            user_email=recipient["email"],
            refund_amount=str(booking.get("refund_amount", "0.00")),
            penalty_amount=str(booking.get("penalty_amount", "0.00")),
        )


@dataclass(frozen=True)
class BookingDatesChangedEvent:
    booking_id: str
    property_id: str
    old_period_start: str
    old_period_end: str
    new_period_start: str
    new_period_end: str
    new_price: str
    price_difference: str
    user_id: str
    user_email: str

    @classmethod
    def from_message(cls, message: dict[str, Any]) -> "BookingDatesChangedEvent":
        booking = message["booking"]
        recipient = message["recipient"]
        return cls(
            booking_id=booking["id"],
            property_id=booking["property_id"],
            old_period_start=booking["old_period_start"],
            old_period_end=booking["old_period_end"],
            new_period_start=booking["new_period_start"],
            new_period_end=booking["new_period_end"],
            new_price=str(booking["new_price"]),
            price_difference=str(booking["price_difference"]),
            user_id=recipient["user_id"],
            user_email=recipient["email"],
        )
