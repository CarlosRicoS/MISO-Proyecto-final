"""Admin approve reservation saga.

Steps:
1. GET booking — verify it exists and is PENDING.
2. POST admin-approve to booking service (PENDING → APPROVED).

No compensation needed: if step 2 fails the booking remains PENDING.
No notification is sent on approval alone — the traveler is notified
when payment confirms the booking.
"""

import logging
from typing import Any

from booking_orchestrator.application.commands import AdminApproveReservationCommand
from booking_orchestrator.application.ports import BookingClient
from booking_orchestrator.domain.exceptions import (
    BookingApproveError,
    BookingNotFoundError,
    ReservationFailedError,
)

logger = logging.getLogger(__name__)


class AdminApproveReservationUseCase:
    def __init__(self, booking_client: BookingClient) -> None:
        self._booking = booking_client

    async def execute(self, command: AdminApproveReservationCommand) -> dict[str, Any]:
        # Step 1: fetch the booking — raises BookingNotFoundError on 404.
        try:
            booking = await self._booking.get(command.booking_id)
        except BookingNotFoundError:
            raise

        if booking.get("status") != "PENDING":
            raise ReservationFailedError("booking_not_pending")

        # Step 2: admin-approve in booking service.
        try:
            updated = await self._booking.admin_approve(command.booking_id)
        except BookingApproveError as exc:
            raise ReservationFailedError(exc.detail) from exc

        return updated
