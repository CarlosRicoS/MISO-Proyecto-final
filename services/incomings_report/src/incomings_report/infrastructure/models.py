from datetime import date, datetime
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import Date, DateTime, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from incomings_report.database import ReportsBase


class ReportModel(ReportsBase):
    __tablename__ = "report"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    booking_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    payment_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payment_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    update_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    admin_group_id: Mapped[str | None] = mapped_column(String, nullable=True)
    gross_value: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    taxes: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    commission: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    net_income: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
