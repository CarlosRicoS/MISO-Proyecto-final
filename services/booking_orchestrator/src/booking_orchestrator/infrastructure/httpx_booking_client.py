"""HTTP adapter that calls the booking microservice.

Forwards the authenticated caller's X-User-Id header on outbound calls so the
booking service attributes the booking to the correct Cognito user.
"""

from typing import Any

import httpx

from booking_orchestrator.application.commands import (
    ChangeDatesReservationCommand,
    CreateReservationCommand,
)
from booking_orchestrator.domain.exceptions import (
    BookingChangeDatesError,
    BookingCreateError,
    BookingNotFoundError,
)


class HttpxBookingClient:
    def __init__(self, client: httpx.AsyncClient) -> None:
        self._client = client

    async def create(self, command: CreateReservationCommand) -> dict[str, Any]:
        payload = {
            "property_id": command.property_id,
            "guests": command.guests,
            "period_start": command.period_start,
            "period_end": command.period_end,
            "price": str(command.price),
            "admin_group_id": command.admin_group_id,
        }
        headers = {"X-User-Id": command.user_id}
        try:
            response = await self._client.post(
                "/api/booking/", json=payload, headers=headers
            )
        except httpx.HTTPError as exc:
            raise BookingCreateError(f"booking service unreachable: {exc}") from exc

        if response.status_code != 201:
            raise BookingCreateError(
                f"booking service returned {response.status_code}: {response.text}"
            )
        return response.json()

    async def cancel(self, booking_id: str, user_id: str) -> None:
        headers = {"X-User-Id": user_id}
        # Failures here bubble up so the use case can log "compensation failed".
        response = await self._client.post(
            f"/api/booking/{booking_id}/cancel", headers=headers
        )
        if response.status_code not in (200, 409):
            # 409 already-cancelled is acceptable for compensation idempotency.
            response.raise_for_status()

    async def get(self, booking_id: str) -> dict[str, Any]:
        try:
            response = await self._client.get(f"/api/booking/{booking_id}")
        except httpx.HTTPError as exc:
            raise BookingCreateError(f"booking service unreachable: {exc}") from exc

        if response.status_code == 404:
            raise BookingNotFoundError(booking_id)

        if response.status_code != 200:
            raise BookingCreateError(
                f"booking service returned {response.status_code}: {response.text}"
            )
        return response.json()

    async def change_dates(self, command: ChangeDatesReservationCommand) -> dict[str, Any]:
        payload = {
            "new_period_start": command.new_period_start,
            "new_period_end": command.new_period_end,
            "new_price": str(command.new_price),
        }
        headers = {"X-User-Id": command.user_id}
        try:
            response = await self._client.patch(
                f"/api/booking/{command.booking_id}/dates", json=payload, headers=headers
            )
        except httpx.HTTPError as exc:
            raise BookingChangeDatesError(f"booking service unreachable: {exc}", 502) from exc

        if response.status_code != 200:
            detail = response.json().get("detail", response.text) if response.content else response.text
            raise BookingChangeDatesError(detail, response.status_code)

        return response.json()
