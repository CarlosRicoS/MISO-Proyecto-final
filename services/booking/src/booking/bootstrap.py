from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from booking.application.cancel_booking import CancelBookingUseCase
from booking.application.create_booking import CreateBookingUseCase
from booking.application.get_booking import GetBookingUseCase, ListUserBookingsUseCase
from booking.database import get_session
from booking.infrastructure.sqlalchemy_booking_repo import SqlAlchemyBookingRepository

SessionDep = Annotated[AsyncSession, Depends(get_session)]


def get_booking_repository(
    session: SessionDep,
) -> SqlAlchemyBookingRepository:
    return SqlAlchemyBookingRepository(session)


RepoDep = Annotated[SqlAlchemyBookingRepository, Depends(get_booking_repository)]


def get_create_booking_use_case(
    repo: RepoDep,
) -> CreateBookingUseCase:
    return CreateBookingUseCase(booking_repository=repo)


def get_get_booking_use_case(
    repo: RepoDep,
) -> GetBookingUseCase:
    return GetBookingUseCase(booking_repository=repo)


def get_list_user_bookings_use_case(
    repo: RepoDep,
) -> ListUserBookingsUseCase:
    return ListUserBookingsUseCase(booking_repository=repo)


def get_cancel_booking_use_case(
    repo: RepoDep,
) -> CancelBookingUseCase:
    return CancelBookingUseCase(booking_repository=repo)
