from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4


@dataclass
class ReportRecord:
    booking_id: str
    gross_value: Decimal
    taxes: Decimal
    commission: Decimal
    net_income: Decimal
    id: UUID = field(default_factory=uuid4)
    payment_reference: str | None = None
    payment_date: date | None = None
    update_date: date | None = None
    admin_group_id: str | None = None
    status: str | None = None
    created_at: datetime | None = None


@dataclass
class BillingRecord:
    id: str
    booking_id: str | None
    value: Decimal | None
    state: str | None
    payment_reference: str | None = None
    payment_date: datetime | None = None
    update_date: datetime | None = None
    admin_group_id: str | None = None
    reason: str | None = None
