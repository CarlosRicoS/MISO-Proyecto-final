"""Adapter-layer tests: httpx clients with mock transport, SQS publisher with moto."""

import json
from decimal import Decimal

import boto3
import httpx
import pytest
from moto import mock_aws

from booking_orchestrator.application.commands import CreateReservationCommand
from booking_orchestrator.domain.events import BookingCreatedEvent
from booking_orchestrator.domain.exceptions import (
    BookingCreateError,
    NotificationPublishError,
    PropertyLockError,
)
from booking_orchestrator.infrastructure.httpx_booking_client import HttpxBookingClient
from booking_orchestrator.infrastructure.httpx_property_client import HttpxPropertyClient
from booking_orchestrator.infrastructure.sqs_notification_publisher import (
    SqsNotificationPublisher,
)


def _cmd() -> CreateReservationCommand:
    return CreateReservationCommand(
        property_id="p",
        user_id="u",
        user_email="e@x.com",
        guests=1,
        period_start="2026-06-01",
        period_end="2026-06-05",
        price=Decimal("10.00"),
        admin_group_id="g",
    )


@pytest.mark.asyncio
async def test_booking_client_forwards_x_user_id():
    captured_headers = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured_headers.update(dict(request.headers))
        return httpx.Response(201, json={"id": "b1", "status": "PENDING"})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport, base_url="http://booking") as hc:
        client = HttpxBookingClient(hc)
        result = await client.create(_cmd())

    assert result["id"] == "b1"
    assert captured_headers["x-user-id"] == "u"


@pytest.mark.asyncio
async def test_booking_client_raises_on_non_201():
    transport = httpx.MockTransport(lambda r: httpx.Response(500, text="boom"))
    async with httpx.AsyncClient(transport=transport, base_url="http://booking") as hc:
        with pytest.raises(BookingCreateError):
            await HttpxBookingClient(hc).create(_cmd())


@pytest.mark.asyncio
async def test_booking_client_cancel_accepts_200_and_409():
    responses = iter(
        [httpx.Response(200, json={}), httpx.Response(409, json={"detail": "already"})]
    )
    transport = httpx.MockTransport(lambda r: next(responses))
    async with httpx.AsyncClient(transport=transport, base_url="http://booking") as hc:
        client = HttpxBookingClient(hc)
        await client.cancel("b1", "u")
        await client.cancel("b1", "u")  # 409 is acceptable for compensation


@pytest.mark.asyncio
async def test_property_client_converts_dates_to_ddmmyyyy():
    captured_body = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured_body.update(json.loads(request.content))
        return httpx.Response(204)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport, base_url="http://props") as hc:
        await HttpxPropertyClient(hc).lock("prop-1", "2026-06-01", "2026-06-05")

    assert captured_body["propertyDetailId"] == "prop-1"
    assert captured_body["startDate"] == "01/06/2026"
    assert captured_body["endDate"] == "05/06/2026"


@pytest.mark.asyncio
async def test_property_client_raises_on_non_204():
    transport = httpx.MockTransport(lambda r: httpx.Response(400, text="bad"))
    async with httpx.AsyncClient(transport=transport, base_url="http://props") as hc:
        with pytest.raises(PropertyLockError):
            await HttpxPropertyClient(hc).lock("p", "2026-06-01", "2026-06-05")


def test_sqs_publisher_sends_message():
    # Use sync test + asyncio.run — combining moto's @mock_aws with pytest-asyncio
    # confuses the test collection layer. Running the coroutine manually sidesteps that.
    import asyncio

    with mock_aws():
        sqs = boto3.client("sqs", region_name="us-east-1")
        queue_url = sqs.create_queue(QueueName="test-q")["QueueUrl"]

        publisher = SqsNotificationPublisher(sqs, queue_url)
        event = BookingCreatedEvent(
            booking_id="b1",
            property_id="p1",
            user_id="u1",
            user_email="x@y.z",
            period_start="2026-06-01",
            period_end="2026-06-05",
            guests=2,
            price=Decimal("10.00"),
            status="PENDING",
        )
        asyncio.run(publisher.publish(event))

        received = sqs.receive_message(QueueUrl=queue_url, MaxNumberOfMessages=1)
        body = json.loads(received["Messages"][0]["Body"])
        assert body["type"] == "BOOKING_CREATED"
        assert body["booking"]["id"] == "b1"


@pytest.mark.asyncio
async def test_sqs_publisher_wraps_boto_errors():
    class Broken:
        def send_message(self, **_kwargs):
            raise RuntimeError("kaboom")

    publisher = SqsNotificationPublisher(Broken(), "http://fake")
    event = BookingCreatedEvent(
        booking_id="b",
        property_id="p",
        user_id="u",
        user_email="e",
        period_start="2026-06-01",
        period_end="2026-06-02",
        guests=1,
        price=Decimal("1"),
        status="PENDING",
    )
    with pytest.raises(NotificationPublishError):
        await publisher.publish(event)
