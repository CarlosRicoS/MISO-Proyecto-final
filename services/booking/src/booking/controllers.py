from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, status

from booking.application.admin_approve_booking import AdminApproveBookingUseCase
from booking.application.admin_confirm_booking import AdminConfirmBookingUseCase
from booking.application.admin_reject_booking import AdminRejectBookingUseCase
from booking.application.cancel_booking import CancelBookingUseCase
from booking.application.change_dates import ChangeDatesUseCase
from booking.application.commands import (
    AdminApproveBookingCommand,
    AdminConfirmBookingCommand,
    AdminRejectBookingCommand,
    CancelBookingCommand,
    ChangeDatesCommand,
    CreateBookingCommand,
    UpdatePaymentStateCommand,
)
from booking.application.create_booking import CreateBookingUseCase
from booking.application.delete_booking import DeleteBookingUseCase
from booking.application.get_booking import GetBookingUseCase, ListUserBookingsUseCase
from booking.application.update_payment_state import UpdatePaymentStateUseCase
from booking.bootstrap import (
    get_admin_approve_booking_use_case,
    get_admin_confirm_booking_use_case,
    get_admin_reject_booking_use_case,
    get_cancel_booking_use_case,
    get_change_dates_use_case,
    get_create_booking_use_case,
    get_delete_booking_use_case,
    get_get_booking_use_case,
    get_list_user_bookings_use_case,
    get_update_payment_state_use_case,
)
from booking.domain.exceptions import (
    BookingAlreadyCancelledError,
    BookingDateChangeNotAllowedError,
    BookingNotFoundError,
    BookingValidationError,
    InvalidBookingPeriodError,
    InvalidBookingStatusTransitionError,
)
from booking.schemas import (
    AdminRejectBookingRequest,
    BookingResponse,
    ChangeDatesRequest,
    ChangeDatesResponse,
    CreateBookingRequest,
    UpdatePaymentStateRequest,
)

router = APIRouter(prefix="/api/booking", tags=["bookings"])


CreateBookingDep = Annotated[CreateBookingUseCase, Depends(get_create_booking_use_case)]
GetBookingDep = Annotated[GetBookingUseCase, Depends(get_get_booking_use_case)]
ListBookingDep = Annotated[ListUserBookingsUseCase, Depends(get_list_user_bookings_use_case)]
CancelBookingDep = Annotated[CancelBookingUseCase, Depends(get_cancel_booking_use_case)]
ChangeDatesDep = Annotated[ChangeDatesUseCase, Depends(get_change_dates_use_case)]
AdminConfirmBookingDep = Annotated[AdminConfirmBookingUseCase, Depends(get_admin_confirm_booking_use_case)]
AdminRejectBookingDep = Annotated[AdminRejectBookingUseCase, Depends(get_admin_reject_booking_use_case)]
AdminApproveBookingDep = Annotated[AdminApproveBookingUseCase, Depends(get_admin_approve_booking_use_case)]
DeleteBookingDep = Annotated[DeleteBookingUseCase, Depends(get_delete_booking_use_case)]
UpdatePaymentStateDep = Annotated[UpdatePaymentStateUseCase, Depends(get_update_payment_state_use_case)]


@router.post(
    "/",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_booking(
    request: CreateBookingRequest,
    use_case: CreateBookingDep,
    x_user_id: str = Header(..., alias="X-User-Id"),
) -> BookingResponse:
    try:
        command = CreateBookingCommand(
            property_id=request.property_id,
            user_id=x_user_id,
            guests=request.guests,
            period_start=request.period_start.isoformat(),
            period_end=request.period_end.isoformat(),
            price=request.price,
            admin_group_id=request.admin_group_id,
        )
        booking = await use_case.execute(command)
        return BookingResponse.from_domain(booking)
    except (BookingValidationError, InvalidBookingPeriodError) as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)) from e


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: UUID,
    use_case: GetBookingDep,
) -> BookingResponse:
    try:
        booking = await use_case.execute(str(booking_id))
        return BookingResponse.from_domain(booking)
    except BookingNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found"
        ) from e


@router.get("/", response_model=list[BookingResponse])
async def list_user_bookings(
    use_case: ListBookingDep,
    x_user_id: str = Header(..., alias="X-User-Id"),
) -> list[BookingResponse]:
    bookings = await use_case.execute(x_user_id)
    return [BookingResponse.from_domain(b) for b in bookings]


@router.post("/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    booking_id: UUID,
    use_case: CancelBookingDep,
    x_user_id: str = Header(..., alias="X-User-Id"),
) -> BookingResponse:
    try:
        command = CancelBookingCommand(
            booking_id=str(booking_id),
            user_id=x_user_id,
        )
        booking = await use_case.execute(command)
        return BookingResponse.from_domain(booking)
    except BookingNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found"
        ) from e
    except BookingAlreadyCancelledError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Booking is already cancelled"
        ) from e
    except InvalidBookingStatusTransitionError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from e


@router.patch("/{booking_id}/dates", response_model=ChangeDatesResponse)
async def change_booking_dates(
    booking_id: UUID,
    request: ChangeDatesRequest,
    use_case: ChangeDatesDep,
    x_user_id: str = Header(..., alias="X-User-Id"),
) -> ChangeDatesResponse:
    try:
        command = ChangeDatesCommand(
            booking_id=str(booking_id),
            user_id=x_user_id,
            new_period_start=request.new_period_start.isoformat(),
            new_period_end=request.new_period_end.isoformat(),
            new_price=request.new_price,
        )
        booking, price_difference = await use_case.execute(command)
        return ChangeDatesResponse.from_domain(booking, price_difference)
    except BookingNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found") from e
    except BookingDateChangeNotAllowedError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from e
    except (BookingValidationError, InvalidBookingPeriodError) as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)) from e


@router.post("/{booking_id}/admin-confirm", response_model=BookingResponse)
async def admin_confirm_booking(
    booking_id: UUID,
    use_case: AdminConfirmBookingDep,
) -> BookingResponse:
    try:
        command = AdminConfirmBookingCommand(booking_id=str(booking_id))
        booking = await use_case.execute(command)
        return BookingResponse.from_domain(booking)
    except BookingNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found") from e
    except InvalidBookingStatusTransitionError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from e


@router.post("/{booking_id}/admin-reject", response_model=BookingResponse)
async def admin_reject_booking(
    booking_id: UUID,
    request: AdminRejectBookingRequest,
    use_case: AdminRejectBookingDep,
) -> BookingResponse:
    try:
        command = AdminRejectBookingCommand(
            booking_id=str(booking_id),
            reason=request.reason,
        )
        booking = await use_case.execute(command)
        return BookingResponse.from_domain(booking)
    except BookingNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found") from e
    except BookingValidationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)) from e
    except InvalidBookingStatusTransitionError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from e


@router.post("/{booking_id}/admin-approve", response_model=BookingResponse)
async def admin_approve_booking(
    booking_id: UUID,
    use_case: AdminApproveBookingDep,
) -> BookingResponse:
    try:
        command = AdminApproveBookingCommand(booking_id=str(booking_id))
        booking = await use_case.execute(command)
        return BookingResponse.from_domain(booking)
    except BookingNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found") from e
    except InvalidBookingStatusTransitionError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from e


@router.post("/{booking_id}/update-payment-state", response_model=BookingResponse)
async def update_payment_state(
    booking_id: UUID,
    request: UpdatePaymentStateRequest,
    use_case: UpdatePaymentStateDep,
) -> BookingResponse:
    try:
        command = UpdatePaymentStateCommand(
            booking_id=str(booking_id),
            payment_reference=request.payment_reference,
        )
        booking = await use_case.execute(command)
        return BookingResponse.from_domain(booking)
    except BookingNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found") from e
    except InvalidBookingStatusTransitionError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from e
    except BookingValidationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)) from e


@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_booking(
    booking_id: UUID,
    use_case: DeleteBookingDep,
) -> None:
    try:
        await use_case.execute(str(booking_id))
    except BookingNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found") from e
    except InvalidBookingStatusTransitionError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from e
