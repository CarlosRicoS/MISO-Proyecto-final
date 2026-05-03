from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class ReportRecordSchema(BaseModel):
    id: UUID
    booking_id: str
    payment_reference: str | None = None
    payment_date: date | None = None
    gross_value: Decimal
    taxes: Decimal
    commission: Decimal
    net_income: Decimal
    status: str | None = None

    model_config = {"from_attributes": True}


class IncomingReportResponse(BaseModel):
    records: list[ReportRecordSchema]
    total_records: int
    total_gross: Decimal
    total_net: Decimal


class RevenueDataPoint(BaseModel):
    month: int
    year: int
    label: str
    total_revenue: Decimal


class RevenueOverviewResponse(BaseModel):
    data: list[RevenueDataPoint]


class DashboardMetricsResponse(BaseModel):
    total_reservations: int
    monthly_revenue: Decimal
    avg_daily_revenue: float
    revenue_trend_pct: float
    today_checkins: int
    today_checkouts: int
