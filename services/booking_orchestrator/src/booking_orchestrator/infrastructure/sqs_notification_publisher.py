"""SQS adapter that publishes BookingCreatedEvent onto notifications_queue.

boto3's sqs client is synchronous; we run send_message on a thread so the
event loop is not blocked. The publisher is best-effort — the use case
catches NotificationPublishError and logs it.
"""

import asyncio
import json
from typing import Any

from booking_orchestrator.domain.events import (
    BookingConfirmedEvent,
    BookingCreatedEvent,
    BookingDatesChangedEvent,
    BookingRejectedEvent,
)
from booking_orchestrator.domain.exceptions import NotificationPublishError


class SqsNotificationPublisher:
    def __init__(self, sqs_client: Any, queue_url: str) -> None:
        self._client = sqs_client
        self._queue_url = queue_url

    async def publish(
        self,
        event: BookingCreatedEvent | BookingDatesChangedEvent | BookingConfirmedEvent | BookingRejectedEvent,
    ) -> None:
        body = json.dumps(event.to_message())
        try:
            await asyncio.to_thread(
                self._client.send_message,
                QueueUrl=self._queue_url,
                MessageBody=body,
            )
        except Exception as exc:
            raise NotificationPublishError(str(exc)) from exc
