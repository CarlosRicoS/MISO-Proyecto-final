from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status

from booking_orchestrator.application.commands import CreateReservationCommand
from booking_orchestrator.application.create_reservation import CreateReservationUseCase
from booking_orchestrator.bootstrap import get_create_reservation_use_case
from booking_orchestrator.domain.exceptions import (
    BookingCreateError,
    ReservationFailedError,
)
from booking_orchestrator.schemas import CreateReservationRequest

router = APIRouter(prefix="/api", tags=["reservations"])

UseCaseDep = Annotated[CreateReservationUseCase, Depends(get_create_reservation_use_case)]


@router.post("/reservations", status_code=status.HTTP_201_CREATED)
async def create_reservation(
    request: CreateReservationRequest,
    use_case: UseCaseDep,
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
