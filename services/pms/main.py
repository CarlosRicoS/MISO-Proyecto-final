import asyncio
import random
import os
from datetime import date
from uuid import UUID
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="PMS Microservice")

PROPERTIES_SERVICE_URL = os.getenv("PROPERTIES_SERVICE_URL", "http://properties")
PROPERTIES_ENDPOINT = os.getenv("PROPERTIES_ENDPOINT", "api/property/lock")


def _to_dd_mm_yyyy(d: date) -> str:
    return d.strftime("%d/%m/%Y")


class LockPropertyRequest(BaseModel):
    property_id: str  # Property detail ID (e.g. prop-001 or UUID)
    start_date: date
    end_date: date
    user_id: Optional[UUID] = None


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "pms"}


@app.post("/api/pms/lock-property")
async def lock_property(request: LockPropertyRequest):
    # Introduce a random delay between 1 and 5 seconds
    delay = random.uniform(1.0, 5.0)
    await asyncio.sleep(delay)

    # Map PMS payload to Properties service format (propertyDetailId, startDate/endDate in dd/MM/yyyy)
    properties_payload = {
        "propertyDetailId": request.property_id,
        "startDate": _to_dd_mm_yyyy(request.start_date),
        "endDate": _to_dd_mm_yyyy(request.end_date),
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{PROPERTIES_SERVICE_URL}/{PROPERTIES_ENDPOINT}",
                json=properties_payload,
            )

            if response.status_code == 204:
                return {"status": "locked", "message": "Property locked successfully"}
            if response.status_code >= 400:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=response.text or f"Properties service error: {response.status_code}",
                )
            return response.json() if response.content else {"status": "ok"}
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=503,
                detail=f"Error connecting to Properties service: {exc}",
            )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=80)
