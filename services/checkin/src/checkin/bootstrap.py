from typing import Annotated

import httpx
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from checkin.application.check_availability import CheckAvailabilityUseCase
from checkin.application.perform_checkin import PerformCheckInUseCase
from checkin.application.register_property import RegisterPropertyUseCase
from checkin.config import settings
from checkin.database import get_session
from checkin.infrastructure.httpx_booking_client import HttpxBookingClient
from checkin.infrastructure.sqlalchemy_checkin_repo import SqlAlchemyCheckInRepository

SessionDep = Annotated[AsyncSession, Depends(get_session)]


def get_checkin_repository(
    session: SessionDep,
) -> SqlAlchemyCheckInRepository:
    return SqlAlchemyCheckInRepository(session)


RepoDep = Annotated[SqlAlchemyCheckInRepository, Depends(get_checkin_repository)]


def get_booking_client() -> HttpxBookingClient:
    client = httpx.AsyncClient(
        base_url=settings.BOOKING_SERVICE_URL,
        timeout=settings.UPSTREAM_HTTP_TIMEOUT,
    )
    return HttpxBookingClient(client)


BookingClientDep = Annotated[HttpxBookingClient, Depends(get_booking_client)]


def get_register_property_use_case(
    repo: RepoDep,
) -> RegisterPropertyUseCase:
    return RegisterPropertyUseCase(checkin_repository=repo)


def get_check_availability_use_case(
    repo: RepoDep,
) -> CheckAvailabilityUseCase:
    return CheckAvailabilityUseCase(checkin_repository=repo)


def get_perform_checkin_use_case(
    repo: RepoDep,
    booking_client: BookingClientDep,
) -> PerformCheckInUseCase:
    return PerformCheckInUseCase(checkin_repository=repo, booking_client=booking_client)
