import calendar
from datetime import date, datetime, timezone
from decimal import Decimal

from incomings_report.domain.entities import BillingRecord, ReportRecord

_MONTH_LABELS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]


class InMemoryReportRepository:
    """
    In-memory implementation of the ReportRepository port.
    Used by the test suite to avoid real DB connections.
    Conforms to the ReportRepository Protocol via structural typing.
    """

    def __init__(
        self,
        billing_records: list[BillingRecord] | None = None,
        report_records: list[ReportRecord] | None = None,
    ) -> None:
        self._billing: list[BillingRecord] = billing_records or []
        # Keyed by booking_id for upsert semantics
        self._reports: dict[str, ReportRecord] = {
            r.booking_id: r for r in (report_records or [])
        }

    # ----------------------------------------------------------------
    # BillingDB reads
    # ----------------------------------------------------------------

    async def get_all_billing(
        self,
        start_date: date | None,
        end_date: date | None,
    ) -> list[BillingRecord]:
        result = []
        for b in self._billing:
            pd = b.payment_date.date() if b.payment_date else None
            if start_date and pd and pd < start_date:
                continue
            if end_date and pd and pd > end_date:
                continue
            result.append(b)
        return result

    # ----------------------------------------------------------------
    # ReportsDB writes
    # ----------------------------------------------------------------

    async def upsert_reports(self, records: list[ReportRecord]) -> None:
        for r in records:
            self._reports[r.booking_id] = r

    # ----------------------------------------------------------------
    # ReportsDB reads
    # ----------------------------------------------------------------

    async def get_all_reports(
        self,
        start_date: date | None,
        end_date: date | None,
    ) -> list[ReportRecord]:
        result = []
        for r in self._reports.values():
            if start_date and r.payment_date and r.payment_date < start_date:
                continue
            if end_date and r.payment_date and r.payment_date > end_date:
                continue
            result.append(r)
        return sorted(
            result,
            key=lambda r: r.payment_date or date.min,
            reverse=True,
        )

    async def get_revenue_overview(self, months: int) -> list[dict]:
        now = datetime.now(tz=timezone.utc)
        cutoff_year = now.year
        cutoff_month = now.month - months + 1
        while cutoff_month <= 0:
            cutoff_month += 12
            cutoff_year -= 1
        cutoff_date = date(cutoff_year, cutoff_month, 1)

        monthly: dict[tuple[int, int], Decimal] = {}
        for r in self._reports.values():
            if r.payment_date is None or r.payment_date < cutoff_date:
                continue
            key = (r.payment_date.year, r.payment_date.month)
            monthly[key] = monthly.get(key, Decimal("0")) + r.gross_value

        return [
            {
                "month": m,
                "year": y,
                "total_revenue": total,
                "label": _MONTH_LABELS[m - 1],
            }
            for (y, m), total in sorted(monthly.items())
        ]

    async def get_dashboard_metrics(self) -> dict:
        now = datetime.now(tz=timezone.utc)
        today = now.date()
        current_month = today.month
        current_year = today.year
        days_in_month = calendar.monthrange(current_year, current_month)[1]

        if current_month == 1:
            prev_month, prev_year = 12, current_year - 1
        else:
            prev_month, prev_year = current_month - 1, current_year

        total_reservations = len(self._reports)
        monthly_revenue = Decimal("0")
        prev_revenue = Decimal("0")
        today_checkins = 0
        today_checkouts = 0

        for r in self._reports.values():
            if r.payment_date:
                if r.payment_date.year == current_year and r.payment_date.month == current_month:
                    monthly_revenue += r.gross_value
                if r.payment_date.year == prev_year and r.payment_date.month == prev_month:
                    prev_revenue += r.gross_value
                if r.payment_date == today:
                    today_checkins += 1
            if r.update_date and r.update_date == today:
                today_checkouts += 1

        if prev_revenue == Decimal("0"):
            revenue_trend_pct = 0.0
        else:
            revenue_trend_pct = round(
                float((monthly_revenue - prev_revenue) / prev_revenue * 100), 1
            )

        avg_daily_revenue = round(float(monthly_revenue) / days_in_month, 2)

        return {
            "total_reservations": total_reservations,
            "monthly_revenue": monthly_revenue,
            "avg_daily_revenue": avg_daily_revenue,
            "revenue_trend_pct": revenue_trend_pct,
            "today_checkins": today_checkins,
            "today_checkouts": today_checkouts,
        }
