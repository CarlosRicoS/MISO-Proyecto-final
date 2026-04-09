"""HTTP adapter that calls poc_properties /api/property/lock.

poc_properties expects dates in dd/MM/yyyy format; this adapter converts
from ISO YYYY-MM-DD on the way out and surfaces PropertyLockError on failure.
"""

from datetime import date

import httpx

from booking_orchestrator.domain.exceptions import PropertyLockError


def _to_ddmmyyyy(iso_date: str) -> str:
    return date.fromisoformat(iso_date).strftime("%d/%m/%Y")


class HttpxPropertyClient:
    def __init__(self, client: httpx.AsyncClient) -> None:
        self._client = client

    async def lock(self, property_id: str, period_start: str, period_end: str) -> None:
        payload = {
            "propertyDetailId": property_id,
            "startDate": _to_ddmmyyyy(period_start),
            "endDate": _to_ddmmyyyy(period_end),
        }
        try:
            response = await self._client.post("/api/property/lock", json=payload)
        except httpx.HTTPError as exc:
            raise PropertyLockError(f"properties service unreachable: {exc}") from exc

        if response.status_code != 204:
            raise PropertyLockError(
                f"properties service returned {response.status_code}: {response.text}"
            )
