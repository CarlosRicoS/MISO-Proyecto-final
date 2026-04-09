"""Async SQS long-polling consumer loop.

Runs as a background task started/stopped by the FastAPI lifespan context.
Uses asyncio.to_thread around boto3's sync client so the event loop stays free.

Delete semantics:
- handler success → delete message (ack)
- UnsupportedSchemaError → DO NOT delete (SQS retries, eventually DLQ)
- unexpected exception → DO NOT delete (SQS retries, eventually DLQ)
"""

import asyncio
import json
import logging
from typing import Any

from notifications.domain.exceptions import UnsupportedSchemaError
from notifications.infrastructure.dispatcher import MessageDispatcher

logger = logging.getLogger(__name__)


class SqsConsumer:
    def __init__(
        self,
        *,
        sqs_client: Any,
        queue_url: str,
        dispatcher: MessageDispatcher,
        wait_time_seconds: int = 20,
        max_messages: int = 10,
    ) -> None:
        self._client = sqs_client
        self._queue_url = queue_url
        self._dispatcher = dispatcher
        self._wait = wait_time_seconds
        self._max = max_messages
        self._stopping = asyncio.Event()

    async def run(self) -> None:
        logger.info("sqs consumer starting on %s", self._queue_url)
        while not self._stopping.is_set():
            try:
                await self._poll_once()
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("consumer loop error, continuing")
                await asyncio.sleep(1)
        logger.info("sqs consumer stopped")

    async def _poll_once(self) -> None:
        response = await asyncio.to_thread(
            self._client.receive_message,
            QueueUrl=self._queue_url,
            MaxNumberOfMessages=self._max,
            WaitTimeSeconds=self._wait,
        )
        messages = response.get("Messages", [])
        for message in messages:
            await self._handle_message(message)

    async def _handle_message(self, message: dict[str, Any]) -> None:
        receipt_handle = message["ReceiptHandle"]
        try:
            body = json.loads(message["Body"])
        except json.JSONDecodeError:
            logger.exception("malformed message body, leaving for DLQ")
            return

        try:
            self._dispatcher.dispatch(body)
        except UnsupportedSchemaError:
            logger.warning("unsupported message schema, leaving for DLQ: %s", body)
            return
        except Exception:
            logger.exception("handler failed, leaving for DLQ: %s", body)
            return

        await asyncio.to_thread(
            self._client.delete_message,
            QueueUrl=self._queue_url,
            ReceiptHandle=receipt_handle,
        )

    def stop(self) -> None:
        self._stopping.set()
