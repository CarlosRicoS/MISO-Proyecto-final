"""Domain events published by the orchestrator onto the notifications queue."""

from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

SCHEMA_VERSION = 1


@dataclass(frozen=True)
class BookingCreatedEvent:
    booking_id: str
    property_id: str
    user_id: str
    user_email: str
    period_start: str
    period_end: str
    guests: int
    price: Decimal
    status: str

    def to_message(self) -> dict[str, Any]:
        """Serialize to the versioned JSON schema consumed by the notifications service."""
        return {
            "schema_version": SCHEMA_VERSION,
            "type": "BOOKING_CREATED",
            "occurred_at": datetime.now(UTC).isoformat(),
            "booking": {
                "id": self.booking_id,
                "property_id": self.property_id,
                "period_start": self.period_start,
                "period_end": self.period_end,
                "guests": self.guests,
                "price": str(self.price),
                "status": self.status,
            },
            "recipient": {
                "user_id": self.user_id,
                "email": self.user_email,
            },
        }


@dataclass(frozen=True)
class BookingConfirmedEvent:
    booking_id: str
    property_id: str
    user_id: str
    user_email: str
    period_start: str
    period_end: str
    guests: int
    price: Decimal
    payment_reference: str

    def to_message(self) -> dict[str, Any]:
        """Serialize to the versioned JSON schema consumed by the notifications service."""
        return {
            "schema_version": SCHEMA_VERSION,
            "type": "BOOKING_CONFIRMED",
            "occurred_at": datetime.now(UTC).isoformat(),
            "booking": {
                "id": self.booking_id,
                "property_id": self.property_id,
                "period_start": self.period_start,
                "period_end": self.period_end,
                "guests": self.guests,
                "price": str(self.price),
                "payment_reference": self.payment_reference,
            },
            "recipient": {
                "user_id": self.user_id,
                "email": self.user_email,
            },
        }


@dataclass(frozen=True)
class BookingRejectedEvent:
    booking_id: str
    property_id: str
    user_id: str
    user_email: str
    period_start: str
    period_end: str
    rejection_reason: str

    def to_message(self) -> dict[str, Any]:
        """Serialize to the versioned JSON schema consumed by the notifications service."""
        return {
            "schema_version": SCHEMA_VERSION,
            "type": "BOOKING_REJECTED",
            "occurred_at": datetime.now(UTC).isoformat(),
            "booking": {
                "id": self.booking_id,
                "property_id": self.property_id,
                "period_start": self.period_start,
                "period_end": self.period_end,
                "rejection_reason": self.rejection_reason,
            },
            "recipient": {
                "user_id": self.user_id,
                "email": self.user_email,
            },
        }


@dataclass(frozen=True)
class PaymentConfirmedEvent:
    booking_id: str
    property_id: str
    user_id: str
    user_email: str
    period_start: str
    period_end: str
    guests: int
    price: Decimal
    payment_reference: str

    def to_message(self) -> dict[str, Any]:
        """Serialize to the versioned JSON schema consumed by the notifications service."""
        return {
            "schema_version": SCHEMA_VERSION,
            "type": "PAYMENT_CONFIRMED",
            "occurred_at": datetime.now(UTC).isoformat(),
            "booking": {
                "id": self.booking_id,
                "property_id": self.property_id,
                "period_start": self.period_start,
                "period_end": self.period_end,
                "guests": self.guests,
                "price": str(self.price),
                "payment_reference": self.payment_reference,
            },
            "recipient": {
                "user_id": self.user_id,
                "email": self.user_email,
            },
        }


@dataclass(frozen=True)
class BookingApprovedEvent:
    booking_id: str
    property_id: str
    user_id: str
    user_email: str
    period_start: str
    period_end: str
    guests: int
    price: Decimal

    def to_message(self) -> dict[str, Any]:
        """Serialize to the versioned JSON schema consumed by the notifications service."""
        return {
            "schema_version": SCHEMA_VERSION,
            "type": "BOOKING_APPROVED",
            "occurred_at": datetime.now(UTC).isoformat(),
            "booking": {
                "id": self.booking_id,
                "property_id": self.property_id,
                "period_start": self.period_start,
                "period_end": self.period_end,
                "guests": self.guests,
                "price": str(self.price),
            },
            "recipient": {
                "user_id": self.user_id,
                "email": self.user_email,
            },
        }


@dataclass(frozen=True)
class BookingCancelledEvent:
    booking_id: str
    property_id: str
    user_id: str
    user_email: str
    period_start: str
    period_end: str
    cancelled_from_status: str

    def to_message(self) -> dict[str, Any]:
        """Serialize to the versioned JSON schema consumed by the notifications service."""
        return {
            "schema_version": SCHEMA_VERSION,
            "type": "BOOKING_CANCELLED",
            "occurred_at": datetime.now(UTC).isoformat(),
            "booking": {
                "id": self.booking_id,
                "property_id": self.property_id,
                "period_start": self.period_start,
                "period_end": self.period_end,
                "cancelled_from_status": self.cancelled_from_status,
            },
            "recipient": {
                "user_id": self.user_id,
                "email": self.user_email,
            },
        }


@dataclass(frozen=True)
class BookingDatesChangedEvent:
    booking_id: str
    property_id: str
    user_id: str
    user_email: str
    old_period_start: str
    old_period_end: str
    new_period_start: str
    new_period_end: str
    new_price: Decimal
    price_difference: Decimal

    def to_message(self) -> dict[str, Any]:
        """Serialize to the versioned JSON schema consumed by the notifications service."""
        return {
            "schema_version": SCHEMA_VERSION,
            "type": "BOOKING_DATES_CHANGED",
            "occurred_at": datetime.now(UTC).isoformat(),
            "booking": {
                "id": self.booking_id,
                "property_id": self.property_id,
                "old_period_start": self.old_period_start,
                "old_period_end": self.old_period_end,
                "new_period_start": self.new_period_start,
                "new_period_end": self.new_period_end,
                "new_price": str(self.new_price),
                "price_difference": str(self.price_difference),
            },
            "recipient": {
                "user_id": self.user_id,
                "email": self.user_email,
            },
        }
