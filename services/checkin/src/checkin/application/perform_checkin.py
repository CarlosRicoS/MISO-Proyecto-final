from datetime import date
from uuid import UUID, uuid4

from checkin.application.commands import PerformCheckInCommand
from checkin.application.ports import BookingClient, CheckInRepository
from checkin.domain.exceptions import (
    BookingNotConfirmedError,
    BookingOwnershipError,
    QrTokenMismatchError,
)
from checkin.domain.value_objects import CheckInRecord


class PerformCheckInUseCase:
    """
    Perform digital check-in for a booking.

    Validates the QR token, verifies booking ownership and status,
    records the check-in, and transitions the booking to COMPLETED.
    """

    def __init__(
        self,
        checkin_repository: CheckInRepository,
        booking_client: BookingClient,
    ) -> None:
        self._repo = checkin_repository
        self._booking_client = booking_client

    async def execute(self, command: PerformCheckInCommand) -> dict:
        # 1. Validate QR token exists
        checkin_available = await self._repo.get_available_by_token(command.qr_token)
        if checkin_available is None:
            raise QrTokenMismatchError()

        # 2. Fetch booking (propagates BookingNotFoundError on 404)
        booking = await self._booking_client.get(command.booking_id)

        # 3. Verify booking ownership
        if booking["user_id"] != command.user_id:
            raise BookingOwnershipError()

        # 4. Verify QR token matches the booking's property
        if str(booking["property_id"]) != str(checkin_available.property_id):
            raise QrTokenMismatchError()

        # 5. Verify booking is CONFIRMED
        if booking["status"] != "CONFIRMED":
            raise BookingNotConfirmedError(command.booking_id, booking["status"])

        # 6. Record the check-in
        record = CheckInRecord(
            id=uuid4(),
            booking_id=UUID(command.booking_id),
            check_in_date=date.today(),
        )
        await self._repo.save_checkin(record)

        # 7. Transition booking to COMPLETED
        await self._booking_client.complete(command.booking_id)

        return {
            "booking_id": command.booking_id,
            "check_in_date": str(record.check_in_date),
            "status": "COMPLETED",
        }
