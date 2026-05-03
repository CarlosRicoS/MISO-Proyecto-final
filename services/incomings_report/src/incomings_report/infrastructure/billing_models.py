from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from incomings_report.database import BillingBase


class BillingModel(BillingBase):
    """
    Read-only ORM mapping for the billing table in BillingDB.
    Mirrors BillingEntity.java exactly. No create_all is ever called on
    billing_engine — this class exists only for SELECT operations.
    """

    __tablename__ = "billing"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    booking_id: Mapped[str | None] = mapped_column(String, nullable=True)
    payment_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    update_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    payment_reference: Mapped[str | None] = mapped_column(String, nullable=True)
    admin_group_id: Mapped[str | None] = mapped_column(String, nullable=True)
    value: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    state: Mapped[str | None] = mapped_column(String, nullable=True)
    reason: Mapped[str | None] = mapped_column(String, nullable=True)
