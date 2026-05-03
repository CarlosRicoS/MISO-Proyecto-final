from uuid import UUID

from pydantic import BaseModel

from checkin.domain.value_objects import CheckingAvailable


class RegisterPropertyRequest(BaseModel):
    property_id: str


class RegisterPropertyResponse(BaseModel):
    id: UUID
    property_id: UUID
    qr_token: str

    @classmethod
    def from_domain(cls, record: CheckingAvailable) -> "RegisterPropertyResponse":
        return cls(
            id=record.id,
            property_id=record.property_id,
            qr_token=record.qr_token,
        )


class CheckAvailabilityResponse(BaseModel):
    property_id: str
    is_available: bool


class PerformCheckInRequest(BaseModel):
    booking_id: str
    qr_token: str


class PerformCheckInResponse(BaseModel):
    booking_id: str
    check_in_date: str
    status: str
