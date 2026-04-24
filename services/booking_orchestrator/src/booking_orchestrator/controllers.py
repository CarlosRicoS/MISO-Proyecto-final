from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status

from booking_orchestrator.application.admin_approve_reservation import AdminApproveReservationUseCase
from booking_orchestrator.application.admin_confirm_reservation import AdminConfirmReservationUseCase
from booking_orchestrator.application.admin_reject_reservation import AdminRejectReservationUseCase
from booking_orchestrator.application.cancel_reservation import CancelReservationUseCase
from booking_orchestrator.application.change_dates_reservation import ChangeDatesReservationUseCase
from booking_orchestrator.application.commands import (
    AdminApproveReservationCommand,
    AdminConfirmReservationCommand,
    AdminRejectReservationCommand,
    CancelReservationCommand,
    ChangeDatesReservationCommand,
    CreateReservationCommand,
    GetCancellationPolicyCommand,
    MakePaymentCommand,
)
from booking_orchestrator.application.create_reservation import CreateReservationUseCase
from booking_orchestrator.application.get_cancellation_policy import GetCancellationPolicyUseCase
from booking_orchestrator.application.make_payment import MakePaymentUseCase
from booking_orchestrator.bootstrap import (
    get_admin_approve_reservation_use_case,
    get_admin_confirm_reservation_use_case,
    get_admin_reject_reservation_use_case,
    get_cancel_reservation_use_case,
    get_change_dates_reservation_use_case,
    get_create_reservation_use_case,
    get_get_cancellation_policy_use_case,
    get_make_payment_use_case,
)
from booking_orchestrator.domain.exceptions import (
    BookingChangeDatesError,
    BookingCreateError,
    BookingNotFoundError,
    ReservationFailedError,
)
from booking_orchestrator.schemas import (
    AdminApproveReservationRequest,
    AdminConfirmReservationRequest,
    AdminRejectReservationRequest,
    CancellationPolicyResponse,
    ChangeDatesReservationRequest,
    CreateReservationRequest,
    MakePaymentRequest,
)

router = APIRouter(prefix="/api", tags=["reservations"])

CreateUseCaseDep = Annotated[CreateReservationUseCase, Depends(get_create_reservation_use_case)]
ChangeDatesUseCaseDep = Annotated[
    ChangeDatesReservationUseCase, Depends(get_change_dates_reservation_use_case)
]
AdminConfirmUseCaseDep = Annotated[
    AdminConfirmReservationUseCase, Depends(get_admin_confirm_reservation_use_case)
]
AdminRejectUseCaseDep = Annotated[
    AdminRejectReservationUseCase, Depends(get_admin_reject_reservation_use_case)
]
AdminApproveUseCaseDep = Annotated[
    AdminApproveReservationUseCase, Depends(get_admin_approve_reservation_use_case)
]
CancelUseCaseDep = Annotated[
    CancelReservationUseCase, Depends(get_cancel_reservation_use_case)
]
MakePaymentUseCaseDep = Annotated[
    MakePaymentUseCase, Depends(get_make_payment_use_case)
]
GetCancellationPolicyUseCaseDep = Annotated[
    GetCancellationPolicyUseCase, Depends(get_get_cancellation_policy_use_case)
]


@router.post("/reservations", status_code=status.HTTP_201_CREATED)
async def create_reservation(
    request: CreateReservationRequest,
    use_case: CreateUseCaseDep,
    x_user_id: str = Header(..., alias="X-User-Id"),
    x_user_email: str = Header(..., alias="X-User-Email"),
) -> dict:
    command = CreateReservationCommand(
        property_id=request.property_id,
        user_id=x_user_id,
        user_email=x_user_email,
        guests=request.guests,
        period_start=request.period_start.isoformat(),
        period_end=request.period_end.isoformat(),
        price=request.price,
        admin_group_id=request.admin_group_id,
    )
    try:
        booking = await use_case.execute(command)
    except ReservationFailedError as exc:
        # property_unavailable → 409 Conflict (booking was compensated already).
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=exc.reason
        ) from exc
    except BookingCreateError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=exc.detail
        ) from exc
    return booking


@router.patch("/reservations/{booking_id}/dates", status_code=status.HTTP_200_OK)
async def change_booking_dates(
    booking_id: str,
    request: ChangeDatesReservationRequest,
    use_case: ChangeDatesUseCaseDep,
    x_user_id: str = Header(..., alias="X-User-Id"),
    x_user_email: str = Header(..., alias="X-User-Email"),
) -> dict:
    command = ChangeDatesReservationCommand(
        booking_id=booking_id,
        user_id=x_user_id,
        user_email=x_user_email,
        new_period_start=request.new_period_start.isoformat(),
        new_period_end=request.new_period_end.isoformat(),
        new_price=request.new_price,
    )
    try:
        updated = await use_case.execute(command)
    except BookingNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    except ReservationFailedError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.reason)
    except BookingChangeDatesError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail)
    return updated


@router.post("/reservations/{booking_id}/admin-confirm", status_code=status.HTTP_200_OK)
async def admin_confirm_reservation(
    booking_id: str,
    request: AdminConfirmReservationRequest,
    use_case: AdminConfirmUseCaseDep,
    x_user_id: str = Header(..., alias="X-User-Id"),
) -> dict:
    command = AdminConfirmReservationCommand(
        booking_id=booking_id,
        user_id=x_user_id,
        user_email=request.traveler_email,
    )
    try:
        updated = await use_case.execute(command)
    except BookingNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    except ReservationFailedError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.reason)
    return updated


@router.post("/reservations/{booking_id}/admin-reject", status_code=status.HTTP_200_OK)
async def admin_reject_reservation(
    booking_id: str,
    request: AdminRejectReservationRequest,
    use_case: AdminRejectUseCaseDep,
    x_user_id: str = Header(..., alias="X-User-Id"),
) -> dict:
    command = AdminRejectReservationCommand(
        booking_id=booking_id,
        user_id=x_user_id,
        user_email=request.traveler_email,
        reason=request.reason,
    )
    try:
        updated = await use_case.execute(command)
    except BookingNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    except ReservationFailedError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.reason)
    return updated


@router.post("/reservations/{booking_id}/admin-approve", status_code=status.HTTP_200_OK)
async def admin_approve_reservation(
    booking_id: str,
    request: AdminApproveReservationRequest,
    use_case: AdminApproveUseCaseDep,
    x_user_id: str = Header(..., alias="X-User-Id"),
) -> dict:
    command = AdminApproveReservationCommand(
        booking_id=booking_id,
        user_id=x_user_id,
        user_email=request.traveler_email,
    )
    try:
        updated = await use_case.execute(command)
    except BookingNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    except ReservationFailedError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.reason)
    return updated


@router.post("/reservations/{booking_id}/make-payment", status_code=status.HTTP_200_OK)
async def make_payment(
    booking_id: str,
    request: MakePaymentRequest,
    use_case: MakePaymentUseCaseDep,
    x_user_id: str = Header(..., alias="X-User-Id"),
    x_user_email: str = Header(..., alias="X-User-Email"),
) -> dict:
    command = MakePaymentCommand(
        booking_id=booking_id,
        user_id=x_user_id,
        user_email=x_user_email,
        currency=request.currency,
        payment_method_type=request.payment_method_type,
    )
    try:
        updated = await use_case.execute(command)
    except BookingNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    except ReservationFailedError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.reason)
    return updated


@router.get(
    "/reservations/{booking_id}/cancellation-policy",
    status_code=status.HTTP_200_OK,
    response_model=CancellationPolicyResponse,
)
async def get_cancellation_policy(
    booking_id: str,
    use_case: GetCancellationPolicyUseCaseDep,
    x_user_id: str = Header(..., alias="X-User-Id"),
) -> dict:
    """Return the cancellation policy for a booking.

    Computes refund/penalty amounts based on time-to-checkin and payment status.
    Free cancellation (100% refund) if >= 24h before check-in; 50% penalty otherwise.
    If no payment was made, refund and penalty are both 0.00.

    Args:
        booking_id: UUID of the booking to evaluate.
        x_user_id: Injected by API Gateway from the JWT sub claim.

    Returns:
        CancellationPolicyResponse with is_free_cancellation, refund_amount,
        penalty_amount, and cancellation_deadline.

    Raises:
        HTTPException 404: Booking not found.
    """
    command = GetCancellationPolicyCommand(booking_id=booking_id)
    try:
        result = await use_case.execute(command)
    except BookingNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    return result


@router.post("/reservations/{booking_id}/cancel", status_code=status.HTTP_200_OK)
async def cancel_reservation(
    booking_id: str,
    use_case: CancelUseCaseDep,
    x_user_id: str = Header(..., alias="X-User-Id"),
    x_user_email: str = Header(..., alias="X-User-Email"),
) -> dict:
    command = CancelReservationCommand(
        booking_id=booking_id,
        user_id=x_user_id,
        user_email=x_user_email,
    )
    try:
        result = await use_case.execute(command)
    except BookingNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    except ReservationFailedError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.reason)
    return result
