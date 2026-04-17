"""Routes SQS messages to handlers by type + schema_version.

Unknown type/version messages raise UnsupportedSchemaError — the consumer
does NOT delete them so SQS will retry and eventually redrive to the DLQ
where operators can inspect them.
"""

import logging
from typing import Any, Callable

from notifications.domain.events import (
    SUPPORTED_SCHEMA_VERSION,
    BookingConfirmedEvent,
    BookingCreatedEvent,
    BookingDatesChangedEvent,
    BookingRejectedEvent,
    PaymentConfirmedEvent,
)
from notifications.domain.exceptions import UnsupportedSchemaError

logger = logging.getLogger(__name__)

BookingCreatedHandler = Callable[[BookingCreatedEvent], None]
BookingDatesChangedHandler = Callable[[BookingDatesChangedEvent], None]
BookingConfirmedHandler = Callable[[BookingConfirmedEvent], None]
BookingRejectedHandler = Callable[[BookingRejectedEvent], None]
PaymentConfirmedHandler = Callable[[PaymentConfirmedEvent], None]


class MessageDispatcher:
    def __init__(
        self,
        booking_created_handler: BookingCreatedHandler,
        booking_dates_changed_handler: BookingDatesChangedHandler,
        booking_confirmed_handler: BookingConfirmedHandler,
        booking_rejected_handler: BookingRejectedHandler,
        payment_confirmed_handler: PaymentConfirmedHandler,
    ) -> None:
        self._booking_created = booking_created_handler
        self._booking_dates_changed = booking_dates_changed_handler
        self._booking_confirmed = booking_confirmed_handler
        self._booking_rejected = booking_rejected_handler
        self._payment_confirmed = payment_confirmed_handler

    def dispatch(self, message: dict[str, Any]) -> None:
        schema_version = message.get("schema_version")
        msg_type = message.get("type")

        if schema_version != SUPPORTED_SCHEMA_VERSION:
            raise UnsupportedSchemaError(
                f"unsupported schema_version={schema_version}"
            )

        if msg_type == "BOOKING_CREATED":
            event = BookingCreatedEvent.from_message(message)
            self._booking_created(event)
            return

        if msg_type == "BOOKING_DATES_CHANGED":
            event = BookingDatesChangedEvent.from_message(message)
            self._booking_dates_changed(event)
            return

        if msg_type == "BOOKING_CONFIRMED":
            event = BookingConfirmedEvent.from_message(message)
            self._booking_confirmed(event)
            return

        if msg_type == "BOOKING_REJECTED":
            event = BookingRejectedEvent.from_message(message)
            self._booking_rejected(event)
            return

        if msg_type == "PAYMENT_CONFIRMED":
            event = PaymentConfirmedEvent.from_message(message)
            self._payment_confirmed(event)
            return

        raise UnsupportedSchemaError(f"unknown message type={msg_type}")
