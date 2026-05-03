import httpx

from checkin.domain.exceptions import BookingNotFoundError


class HttpxBookingClient:
    """
    HTTP adapter implementing BookingClient port.

    Calls the booking service directly within the VPC.
    """

    def __init__(self, client: httpx.AsyncClient) -> None:
        self._client = client

    async def get(self, booking_id: str) -> dict:
        response = await self._client.get(f"/api/booking/{booking_id}")
        if response.status_code == 404:
            raise BookingNotFoundError(booking_id)
        if response.status_code != 200:
            response.raise_for_status()
        return response.json()

    async def complete(self, booking_id: str) -> dict:
        response = await self._client.post(f"/api/booking/{booking_id}/complete")
        if response.status_code != 200:
            response.raise_for_status()
        return response.json()
