from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status

from checkin.application.check_availability import CheckAvailabilityUseCase
from checkin.application.commands import (
    CheckAvailabilityQuery,
    PerformCheckInCommand,
    RegisterPropertyCommand,
)
from checkin.application.perform_checkin import PerformCheckInUseCase
from checkin.application.register_property import RegisterPropertyUseCase
from checkin.bootstrap import (
    get_check_availability_use_case,
    get_perform_checkin_use_case,
    get_register_property_use_case,
)
from checkin.domain.exceptions import (
    BookingNotConfirmedError,
    BookingNotFoundError,
    BookingOwnershipError,
    PropertyAlreadyRegisteredError,
    QrTokenMismatchError,
)
from checkin.schemas import (
    CheckAvailabilityResponse,
    PerformCheckInRequest,
    PerformCheckInResponse,
    RegisterPropertyRequest,
    RegisterPropertyResponse,
)

router = APIRouter(prefix="/api/check-in", tags=["check-in"])

RegisterPropertyDep = Annotated[RegisterPropertyUseCase, Depends(get_register_property_use_case)]
CheckAvailabilityDep = Annotated[CheckAvailabilityUseCase, Depends(get_check_availability_use_case)]
PerformCheckInDep = Annotated[PerformCheckInUseCase, Depends(get_perform_checkin_use_case)]


@router.post(
    "/available",
    response_model=RegisterPropertyResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_property(
    request: RegisterPropertyRequest,
    use_case: RegisterPropertyDep,
) -> RegisterPropertyResponse:
    """
    Register a property for digital check-in (POC — public, no JWT required).

    Generates a random QR token server-side and stores it alongside the property_id.
    Hotel staff call this once per property to obtain the token to embed in the
    physical QR code displayed at the hotel entrance.

    Args:
        request: Body containing the `property_id` (UUID) to register.

    Returns:
        The created record including `id`, `property_id`, and the generated `qr_token`.

    Raises:
        HTTPException 409: Property is already registered for digital check-in.
    """
    try:
        command = RegisterPropertyCommand(property_id=request.property_id)
        record = await use_case.execute(command)
        return RegisterPropertyResponse.from_domain(record)
    except PropertyAlreadyRegisteredError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        ) from e


@router.get("/available", response_model=CheckAvailabilityResponse)
async def check_availability(
    property_id: str,
    use_case: CheckAvailabilityDep,
    x_user_id: str = Header(..., alias="X-User-Id"),
) -> CheckAvailabilityResponse:
    """
    Check whether a property has digital check-in enabled. JWT required.

    The booking-detail page calls this in parallel with the booking fetch on load.
    Returns `is_available: false` (not 404) when the property is not registered.

    Args:
        property_id: UUID of the property to check (query parameter).
        x_user_id: Injected by API Gateway from the JWT sub claim.

    Returns:
        `{ property_id, is_available }` — always 200, never 404.
    """
    query = CheckAvailabilityQuery(property_id=property_id)
    result = await use_case.execute(query)
    return CheckAvailabilityResponse(
        property_id=result["property_id"],
        is_available=result["is_available"],
    )


@router.post("/", response_model=PerformCheckInResponse)
async def perform_checkin(
    request: PerformCheckInRequest,
    use_case: PerformCheckInDep,
    x_user_id: str = Header(..., alias="X-User-Id"),
) -> PerformCheckInResponse:
    """
    Perform digital check-in for a CONFIRMED booking. JWT required.

    Validates the QR token against the booking's property, verifies the booking is
    CONFIRMED and owned by the caller, records a check-in audit row, and calls the
    booking service to transition the reservation to COMPLETED.

    Args:
        request: Body containing `booking_id` (UUID) and `qr_token` (string from QR scan).
        x_user_id: Injected by API Gateway from the JWT sub claim.

    Returns:
        `{ booking_id, check_in_date, status: "COMPLETED" }` on success.

    Raises:
        HTTPException 400: `qr_token` does not match the property's registered token.
        HTTPException 403: Booking belongs to a different user.
        HTTPException 404: Booking not found.
        HTTPException 409: Booking is not in CONFIRMED status (already COMPLETED, CANCELED, etc.).
    """
    try:
        command = PerformCheckInCommand(
            booking_id=request.booking_id,
            qr_token=request.qr_token,
            user_id=x_user_id,
        )
        result = await use_case.execute(command)
        return PerformCheckInResponse(
            booking_id=result["booking_id"],
            check_in_date=result["check_in_date"],
            status=result["status"],
        )
    except QrTokenMismatchError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except BookingNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except BookingOwnershipError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        ) from e
    except BookingNotConfirmedError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        ) from e
    except PropertyAlreadyRegisteredError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        ) from e
