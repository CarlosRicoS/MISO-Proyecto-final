"""Consumer tests using moto for SQS — no live AWS required.

These tests are synchronous and drive the async consumer via asyncio.run()
because combining moto's @mock_aws context with pytest-asyncio test functions
causes the async wrapping to be lost.
"""

import asyncio
import json

import boto3
from moto import mock_aws

from notifications.domain.events import BookingCreatedEvent
from notifications.infrastructure.dispatcher import MessageDispatcher
from notifications.infrastructure.sqs_consumer import SqsConsumer


def _make_consumer(sqs, queue_url, received):
    dispatcher = MessageDispatcher(
        booking_created_handler=received.append,
        booking_dates_changed_handler=lambda e: None,
        booking_confirmed_handler=lambda e: None,
        booking_rejected_handler=lambda e: None,
    )
    return SqsConsumer(
        sqs_client=sqs,
        queue_url=queue_url,
        dispatcher=dispatcher,
        wait_time_seconds=0,
        max_messages=10,
    )


def test_consumer_handles_message_and_deletes_it():
    with mock_aws():
        sqs = boto3.client("sqs", region_name="us-east-1")
        queue_url = sqs.create_queue(QueueName="test-q")["QueueUrl"]
        sqs.send_message(
            QueueUrl=queue_url,
            MessageBody=json.dumps(
                {
                    "schema_version": 1,
                    "type": "BOOKING_CREATED",
                    "booking": {
                        "id": "b1",
                        "property_id": "p1",
                        "period_start": "2026-06-01",
                        "period_end": "2026-06-05",
                        "guests": 1,
                        "price": "10",
                        "status": "PENDING",
                    },
                    "recipient": {"user_id": "u1", "email": "t@x.com"},
                }
            ),
        )

        received: list[BookingCreatedEvent] = []
        consumer = _make_consumer(sqs, queue_url, received)
        asyncio.run(consumer._poll_once())

        assert len(received) == 1
        assert received[0].booking_id == "b1"

        remaining = sqs.receive_message(QueueUrl=queue_url, WaitTimeSeconds=0)
        assert "Messages" not in remaining


def test_consumer_does_not_delete_on_unsupported_schema():
    with mock_aws():
        sqs = boto3.client("sqs", region_name="us-east-1")
        queue_url = sqs.create_queue(
            QueueName="test-q2",
            Attributes={"VisibilityTimeout": "0"},
        )["QueueUrl"]
        sqs.send_message(
            QueueUrl=queue_url,
            MessageBody=json.dumps({"schema_version": 99, "type": "BOOKING_CREATED"}),
        )

        consumer = _make_consumer(sqs, queue_url, [])
        asyncio.run(consumer._poll_once())

        remaining = sqs.receive_message(QueueUrl=queue_url, WaitTimeSeconds=0)
        assert "Messages" in remaining


def test_consumer_skips_malformed_json():
    with mock_aws():
        sqs = boto3.client("sqs", region_name="us-east-1")
        queue_url = sqs.create_queue(QueueName="test-q3")["QueueUrl"]
        sqs.send_message(QueueUrl=queue_url, MessageBody="not json {{")

        consumer = _make_consumer(sqs, queue_url, [])
        # Should not raise.
        asyncio.run(consumer._poll_once())


def test_consumer_does_not_delete_on_handler_exception():
    with mock_aws():
        sqs = boto3.client("sqs", region_name="us-east-1")
        queue_url = sqs.create_queue(
            QueueName="test-q4",
            Attributes={"VisibilityTimeout": "0"},
        )["QueueUrl"]
        sqs.send_message(
            QueueUrl=queue_url,
            MessageBody=json.dumps(
                {
                    "schema_version": 1,
                    "type": "BOOKING_CREATED",
                    "booking": {
                        "id": "b1",
                        "property_id": "p1",
                        "period_start": "2026-06-01",
                        "period_end": "2026-06-05",
                        "guests": 1,
                        "price": "10",
                        "status": "PENDING",
                    },
                    "recipient": {"user_id": "u1", "email": "t@x.com"},
                }
            ),
        )

        def boom(_event):
            raise RuntimeError("handler broken")

        dispatcher = MessageDispatcher(
            booking_created_handler=boom,
            booking_dates_changed_handler=lambda e: None,
            booking_confirmed_handler=lambda e: None,
            booking_rejected_handler=lambda e: None,
        )
        consumer = SqsConsumer(
            sqs_client=sqs, queue_url=queue_url, dispatcher=dispatcher, wait_time_seconds=0
        )
        asyncio.run(consumer._poll_once())

        remaining = sqs.receive_message(QueueUrl=queue_url, WaitTimeSeconds=0)
        assert "Messages" in remaining


def test_consumer_run_exits_on_stop():
    """Drives the top-level run() loop: start, stop, assert it returns."""
    with mock_aws():
        sqs = boto3.client("sqs", region_name="us-east-1")
        queue_url = sqs.create_queue(QueueName="test-q5")["QueueUrl"]

        consumer = _make_consumer(sqs, queue_url, [])

        async def _drive():
            task = asyncio.create_task(consumer.run())
            await asyncio.sleep(0.05)
            consumer.stop()
            await asyncio.wait_for(task, timeout=2)

        asyncio.run(_drive())
