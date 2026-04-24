"""SQS adapter that publishes billing commands onto billing_queue.

The message format matches BillingMessageDto consumed by the billing
microservice's BillingSqsListener: an ``operation`` string and a
``payload`` map with the command fields.

boto3's sqs client is synchronous; we run send_message on a thread so the
event loop is not blocked.  Publishing is best-effort — the use case
catches BillingPublishError and logs it.
"""

import asyncio
import json
from decimal import Decimal
from typing import Any

from booking_orchestrator.domain.exceptions import BillingPublishError


class SqsBillingPublisher:
    def __init__(self, sqs_client: Any, queue_url: str) -> None:
        self._client = sqs_client
        self._queue_url = queue_url

    async def publish_create(
        self,
        booking_id: str,
        payment_reference: str,
        payment_date: str,
        admin_group_id: str,
        value: Decimal,
    ) -> None:
        """Publish a CREATE billing command to the billing SQS queue."""
        body = json.dumps({
            "operation": "CREATE",
            "payload": {
                "bookingId": booking_id,
                "paymentReference": payment_reference,
                "paymentDate": payment_date,
                "adminGroupId": admin_group_id,
                "value": str(value),
            },
        })
        try:
            await asyncio.to_thread(
                self._client.send_message,
                QueueUrl=self._queue_url,
                MessageBody=body,
            )
        except Exception as exc:
            raise BillingPublishError(str(exc)) from exc

    async def publish_cancel(self, booking_id: str, reason: str) -> None:
        """Publish a CANCEL billing command to the billing SQS queue."""
        body = json.dumps({
            "operation": "CANCEL",
            "payload": {
                "bookingId": booking_id,
                "reason": reason,
            },
        })
        try:
            await asyncio.to_thread(
                self._client.send_message,
                QueueUrl=self._queue_url,
                MessageBody=body,
            )
        except Exception as exc:
            raise BillingPublishError(str(exc)) from exc
