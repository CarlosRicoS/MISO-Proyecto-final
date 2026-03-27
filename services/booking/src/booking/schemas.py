from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from booking.domain.booking import Booking


class CreateBookingRequest(BaseModel):
    property_id: str
    guests: int
    period_start: date
    period_end: date
    price: Decimal
    admin_group_id: str


class BookingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    property_id: UUID
    user_id: UUID
    guests: int
    period_start: date
    period_end: date
    price: Decimal
    status: str
    admin_group_id: UUID
    payment_reference: str | None
    created_at: datetime

    @classmethod
    def from_domain(cls, booking: Booking) -> "BookingResponse":
        return cls(
            id=booking.id,
            property_id=booking.property_id,
            user_id=booking.user_id,
            guests=booking.guests,
            period_start=booking.period.start_date,
            period_end=booking.period.end_date,
            price=booking.price.amount,
            status=booking.status.value,
            admin_group_id=booking.admin_group_id,
            payment_reference=booking.payment_reference,
            created_at=booking.created_at,
        )
