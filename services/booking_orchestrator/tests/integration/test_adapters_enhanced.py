"""Adapter tests for the new unlock() and publish_cancel() methods.

Follows the same patterns as test_adapters.py — httpx MockTransport and moto for SQS.
"""

import asyncio
import json

import boto3
import httpx
import pytest
from moto import mock_aws

from booking_orchestrator.domain.exceptions import BillingPublishError, PropertyLockError
from booking_orchestrator.infrastructure.httpx_property_client import HttpxPropertyClient
from booking_orchestrator.infrastructure.sqs_billing_publisher import SqsBillingPublisher


# ---- HttpxPropertyClient.unlock() -------------------------------------------

@pytest.mark.asyncio
async def test_unlock_success_200():
    transport = httpx.MockTransport(lambda r: httpx.Response(200))
    async with httpx.AsyncClient(transport=transport, base_url="http://props") as hc:
        await HttpxPropertyClient(hc).unlock("prop-1", "2026-06-01", "2026-06-05")


@pytest.mark.asyncio
async def test_unlock_success_204():
    transport = httpx.MockTransport(lambda r: httpx.Response(204))
    async with httpx.AsyncClient(transport=transport, base_url="http://props") as hc:
        await HttpxPropertyClient(hc).unlock("prop-1", "2026-06-01", "2026-06-05")


@pytest.mark.asyncio
async def test_unlock_failure_raises_property_lock_error():
    transport = httpx.MockTransport(lambda r: httpx.Response(500, text="internal"))
    async with httpx.AsyncClient(transport=transport, base_url="http://props") as hc:
        with pytest.raises(PropertyLockError):
            await HttpxPropertyClient(hc).unlock("prop-1", "2026-06-01", "2026-06-05")


@pytest.mark.asyncio
async def test_unlock_400_raises_property_lock_error():
    transport = httpx.MockTransport(lambda r: httpx.Response(400, text="bad request"))
    async with httpx.AsyncClient(transport=transport, base_url="http://props") as hc:
        with pytest.raises(PropertyLockError):
            await HttpxPropertyClient(hc).unlock("prop-1", "2026-06-01", "2026-06-05")


@pytest.mark.asyncio
async def test_unlock_converts_dates_to_ddmmyyyy():
    captured_body = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured_body.update(json.loads(request.content))
        return httpx.Response(204)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport, base_url="http://props") as hc:
        await HttpxPropertyClient(hc).unlock("prop-1", "2026-06-01", "2026-06-05")

    assert captured_body["propertyDetailId"] == "prop-1"
    assert captured_body["startDate"] == "01/06/2026"
    assert captured_body["endDate"] == "05/06/2026"


@pytest.mark.asyncio
async def test_unlock_calls_correct_endpoint():
    captured_url = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured_url["path"] = str(request.url.path)
        return httpx.Response(204)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport, base_url="http://props") as hc:
        await HttpxPropertyClient(hc).unlock("prop-1", "2026-06-01", "2026-06-05")

    assert captured_url["path"] == "/api/property/unlock"


@pytest.mark.asyncio
async def test_unlock_network_error_raises_property_lock_error():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused")

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport, base_url="http://props") as hc:
        with pytest.raises(PropertyLockError, match="unreachable"):
            await HttpxPropertyClient(hc).unlock("prop-1", "2026-06-01", "2026-06-05")


# ---- SqsBillingPublisher.publish_cancel() ------------------------------------

def test_billing_publisher_publish_cancel_sends_message():
    """Sync test + asyncio.run to avoid moto/pytest-asyncio conflicts (same pattern as test_adapters.py)."""
    with mock_aws():
        sqs = boto3.client("sqs", region_name="us-east-1")
        queue_url = sqs.create_queue(QueueName="billing-q")["QueueUrl"]

        publisher = SqsBillingPublisher(sqs, queue_url)
        asyncio.run(publisher.publish_cancel(booking_id="b1", reason="user_cancellation"))

        received = sqs.receive_message(QueueUrl=queue_url, MaxNumberOfMessages=1)
        body = json.loads(received["Messages"][0]["Body"])
        assert body["operation"] == "CANCEL"
        assert body["payload"]["bookingId"] == "b1"
        assert body["payload"]["reason"] == "user_cancellation"


@pytest.mark.asyncio
async def test_billing_publisher_publish_cancel_wraps_errors():
    class Broken:
        def send_message(self, **_kwargs):
            raise RuntimeError("kaboom")

    publisher = SqsBillingPublisher(Broken(), "http://fake")
    with pytest.raises(BillingPublishError):
        await publisher.publish_cancel(booking_id="b1", reason="test")
