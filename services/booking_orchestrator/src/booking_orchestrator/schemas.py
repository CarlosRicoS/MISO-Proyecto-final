from datetime import date
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field


class CreateReservationRequest(BaseModel):
    property_id: str
    guests: int = Field(ge=1)
    period_start: date
    period_end: date
    price: Decimal
    admin_group_id: str


class ReservationResponse(BaseModel):
    """Returns the booking payload as the booking service reported it."""

    booking: dict[str, Any]
