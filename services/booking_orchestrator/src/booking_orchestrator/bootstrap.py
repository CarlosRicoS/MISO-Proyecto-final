"""Dependency-injection wiring for the orchestrator.

Singletons (httpx clients, boto3 sqs client) are created once at module load and
reused across requests. FastAPI Depends() exposes the use case to the controller.
"""

from typing import Annotated

import boto3
import httpx
from fastapi import Depends

from booking_orchestrator.application.admin_confirm_reservation import AdminConfirmReservationUseCase
from booking_orchestrator.application.admin_reject_reservation import AdminRejectReservationUseCase
from booking_orchestrator.application.change_dates_reservation import ChangeDatesReservationUseCase
from booking_orchestrator.application.create_reservation import CreateReservationUseCase
from booking_orchestrator.config import settings
from booking_orchestrator.infrastructure.httpx_booking_client import HttpxBookingClient
from booking_orchestrator.infrastructure.httpx_property_client import HttpxPropertyClient
from booking_orchestrator.infrastructure.sqs_notification_publisher import (
    SqsNotificationPublisher,
)

_booking_http_client = httpx.AsyncClient(
    base_url=settings.BOOKING_SERVICE_URL,
    timeout=settings.UPSTREAM_HTTP_TIMEOUT,
)
_property_http_client = httpx.AsyncClient(
    base_url=settings.PROPERTIES_SERVICE_URL,
    timeout=settings.UPSTREAM_HTTP_TIMEOUT,
)
_sqs_client = boto3.client("sqs", region_name=settings.AWS_REGION)


def get_booking_client() -> HttpxBookingClient:
    return HttpxBookingClient(_booking_http_client)


def get_property_client() -> HttpxPropertyClient:
    return HttpxPropertyClient(_property_http_client)


def get_notification_publisher() -> SqsNotificationPublisher:
    return SqsNotificationPublisher(_sqs_client, settings.NOTIFICATIONS_QUEUE_URL)


BookingClientDep = Annotated[HttpxBookingClient, Depends(get_booking_client)]
PropertyClientDep = Annotated[HttpxPropertyClient, Depends(get_property_client)]
PublisherDep = Annotated[SqsNotificationPublisher, Depends(get_notification_publisher)]


def get_create_reservation_use_case(
    booking_client: BookingClientDep,
    property_client: PropertyClientDep,
    publisher: PublisherDep,
) -> CreateReservationUseCase:
    return CreateReservationUseCase(
        booking_client=booking_client,
        property_client=property_client,
        publisher=publisher,
    )


def get_change_dates_reservation_use_case(
    booking_client: BookingClientDep,
    property_client: PropertyClientDep,
    publisher: PublisherDep,
) -> ChangeDatesReservationUseCase:
    return ChangeDatesReservationUseCase(
        booking_client=booking_client,
        property_client=property_client,
        publisher=publisher,
    )


def get_admin_confirm_reservation_use_case(
    booking_client: BookingClientDep,
    publisher: PublisherDep,
) -> AdminConfirmReservationUseCase:
    return AdminConfirmReservationUseCase(
        booking_client=booking_client,
        publisher=publisher,
    )


def get_admin_reject_reservation_use_case(
    booking_client: BookingClientDep,
    publisher: PublisherDep,
) -> AdminRejectReservationUseCase:
    return AdminRejectReservationUseCase(
        booking_client=booking_client,
        publisher=publisher,
    )


async def close_http_clients() -> None:
    await _booking_http_client.aclose()
    await _property_http_client.aclose()
