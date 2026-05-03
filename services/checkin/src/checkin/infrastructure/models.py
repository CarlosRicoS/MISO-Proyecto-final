from datetime import date
from uuid import uuid4

from sqlalchemy import Date, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from checkin.database import Base


class CheckingAvailableModel(Base):
    __tablename__ = "checking_available"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    property_id: Mapped[str] = mapped_column(UUID(as_uuid=True), unique=True, nullable=False)
    qr_token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)


class CheckingModel(Base):
    __tablename__ = "checking"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    booking_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    check_in_date: Mapped[date] = mapped_column(
        Date, nullable=False, server_default=func.current_date()
    )
