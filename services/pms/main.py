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
PROPERTIES_ENDPOINT = os.getenv("PROPERTIES_ENDPOINT", "api/properties/lock")

class LockPropertyRequest(BaseModel):
    property_id: UUID
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
    
    # Proxy the request to the Properties microservice
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{PROPERTIES_SERVICE_URL}/{PROPERTIES_ENDPOINT}",
                json={
                    "property_id": str(request.property_id),
                    "start_date": request.start_date.isoformat(),
                    "end_date": request.end_date.isoformat(),
                    "user_id": str(request.user_id) if request.user_id else None
                }
            )
            
            # Return the response from the Properties service
            return response.json()
        except httpx.RequestError as exc:
            raise HTTPException(status_code=503, detail=f"Error connecting to Properties service: {exc}")
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Internal error: {exc}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=80)
