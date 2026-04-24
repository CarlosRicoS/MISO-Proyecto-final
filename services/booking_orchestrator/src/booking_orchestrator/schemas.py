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


class ChangeDatesReservationRequest(BaseModel):
    new_period_start: date
    new_period_end: date
    new_price: Decimal = Field(ge=0)


class AdminConfirmReservationRequest(BaseModel):
    traveler_email: str


class AdminRejectReservationRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=500)
    traveler_email: str


class AdminApproveReservationRequest(BaseModel):
    traveler_email: str


class MakePaymentRequest(BaseModel):
    currency: str = Field(default="USD", min_length=3, max_length=3)
    payment_method_type: str = Field(default="CREDIT_CARD")


class CancellationPolicyResponse(BaseModel):
    """Cancellation policy evaluation for a specific booking."""

    booking_id: str
    is_free_cancellation: bool
    refund_amount: str
    penalty_amount: str
    cancellation_deadline: str


class ReservationResponse(BaseModel):
    """Returns the booking payload as the booking service reported it."""

    booking: dict[str, Any]
