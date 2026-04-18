from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from booking.application.admin_approve_booking import AdminApproveBookingUseCase
from booking.application.admin_confirm_booking import AdminConfirmBookingUseCase
from booking.application.admin_reject_booking import AdminRejectBookingUseCase
from booking.application.cancel_booking import CancelBookingUseCase
from booking.application.change_dates import ChangeDatesUseCase
from booking.application.create_booking import CreateBookingUseCase
from booking.application.delete_booking import DeleteBookingUseCase
from booking.application.get_booking import GetBookingUseCase, ListUserBookingsUseCase
from booking.application.update_payment_state import UpdatePaymentStateUseCase
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


def get_change_dates_use_case(
    repo: RepoDep,
) -> ChangeDatesUseCase:
    return ChangeDatesUseCase(booking_repository=repo)


def get_admin_confirm_booking_use_case(
    repo: RepoDep,
) -> AdminConfirmBookingUseCase:
    return AdminConfirmBookingUseCase(booking_repository=repo)


def get_admin_reject_booking_use_case(
    repo: RepoDep,
) -> AdminRejectBookingUseCase:
    return AdminRejectBookingUseCase(booking_repository=repo)


def get_admin_approve_booking_use_case(
    repo: RepoDep,
) -> AdminApproveBookingUseCase:
    return AdminApproveBookingUseCase(booking_repository=repo)


def get_update_payment_state_use_case(
    repo: RepoDep,
) -> UpdatePaymentStateUseCase:
    return UpdatePaymentStateUseCase(booking_repository=repo)


def get_delete_booking_use_case(
    repo: RepoDep,
) -> DeleteBookingUseCase:
    return DeleteBookingUseCase(booking_repository=repo)
