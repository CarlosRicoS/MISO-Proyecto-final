"""Routes SQS messages to handlers by type + schema_version.

Unknown type/version messages raise UnsupportedSchemaError — the consumer
does NOT delete them so SQS will retry and eventually redrive to the DLQ
where operators can inspect them.
"""

import logging
from typing import Any, Callable

from notifications.domain.events import SUPPORTED_SCHEMA_VERSION, BookingCreatedEvent
from notifications.domain.exceptions import UnsupportedSchemaError

logger = logging.getLogger(__name__)

BookingCreatedHandler = Callable[[BookingCreatedEvent], None]


class MessageDispatcher:
    def __init__(self, booking_created_handler: BookingCreatedHandler) -> None:
        self._booking_created = booking_created_handler

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

        raise UnsupportedSchemaError(f"unknown message type={msg_type}")
