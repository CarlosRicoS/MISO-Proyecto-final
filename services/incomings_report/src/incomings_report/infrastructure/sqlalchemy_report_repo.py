import calendar
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import extract, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from incomings_report.domain.entities import BillingRecord, ReportRecord
from incomings_report.infrastructure.billing_models import BillingModel
from incomings_report.infrastructure.models import ReportModel


class SqlAlchemyReportRepository:
    """
    Async SQLAlchemy adapter implementing the ReportRepository port.

    Receives two separate sessions:
    - reports_session: read-write access to ReportsDB (report table)
    - billing_session: read-only access to BillingDB (billing table)

    Note: Protocol compliance is structural — no explicit inheritance required.
    """

    def __init__(
        self,
        reports_session: AsyncSession,
        billing_session: AsyncSession,
    ) -> None:
        self._reports_session = reports_session
        self._billing_session = billing_session

    # ------------------------------------------------------------------
    # BillingDB reads
    # ------------------------------------------------------------------

    async def get_all_billing(
        self,
        start_date: date | None,
        end_date: date | None,
    ) -> list[BillingRecord]:
        stmt = select(BillingModel)

        if start_date is not None:
            stmt = stmt.where(func.date(BillingModel.payment_date) >= start_date)
        if end_date is not None:
            stmt = stmt.where(func.date(BillingModel.payment_date) <= end_date)

        result = await self._billing_session.execute(stmt)
        models = result.scalars().all()
        return [self._billing_to_domain(m) for m in models]

    # ------------------------------------------------------------------
    # ReportsDB writes
    # ------------------------------------------------------------------

    async def upsert_reports(self, records: list[ReportRecord]) -> None:
        if not records:
            return

        values = [
            {
                "booking_id": r.booking_id,
                "payment_reference": r.payment_reference,
                "payment_date": r.payment_date,
                "update_date": r.update_date,
                "admin_group_id": r.admin_group_id,
                "gross_value": r.gross_value,
                "taxes": r.taxes,
                "commission": r.commission,
                "net_income": r.net_income,
                "status": r.status,
            }
            for r in records
        ]

        stmt = insert(ReportModel).values(values)
        stmt = stmt.on_conflict_do_update(
            index_elements=["booking_id"],
            set_={
                "payment_reference": stmt.excluded.payment_reference,
                "payment_date": stmt.excluded.payment_date,
                "update_date": stmt.excluded.update_date,
                "admin_group_id": stmt.excluded.admin_group_id,
                "gross_value": stmt.excluded.gross_value,
                "taxes": stmt.excluded.taxes,
                "commission": stmt.excluded.commission,
                "net_income": stmt.excluded.net_income,
                "status": stmt.excluded.status,
            },
        )
        await self._reports_session.execute(stmt)
        await self._reports_session.flush()

    # ------------------------------------------------------------------
    # ReportsDB reads
    # ------------------------------------------------------------------

    async def get_all_reports(
        self,
        start_date: date | None,
        end_date: date | None,
    ) -> list[ReportRecord]:
        stmt = select(ReportModel)

        if start_date is not None:
            stmt = stmt.where(ReportModel.payment_date >= start_date)
        if end_date is not None:
            stmt = stmt.where(ReportModel.payment_date <= end_date)

        stmt = stmt.order_by(ReportModel.payment_date.desc().nullslast())

        result = await self._reports_session.execute(stmt)
        models = result.scalars().all()
        return [self._report_to_domain(m) for m in models]

    async def get_revenue_overview(self, months: int) -> list[dict]:
        now = datetime.now(tz=timezone.utc)
        cutoff_year = now.year
        cutoff_month = now.month - months + 1

        # Adjust for year boundary
        while cutoff_month <= 0:
            cutoff_month += 12
            cutoff_year -= 1

        cutoff_date = date(cutoff_year, cutoff_month, 1)

        stmt = (
            select(
                extract("month", ReportModel.payment_date).label("month"),
                extract("year", ReportModel.payment_date).label("year"),
                func.sum(ReportModel.gross_value).label("total_revenue"),
            )
            .where(ReportModel.payment_date >= cutoff_date)
            .group_by(
                extract("year", ReportModel.payment_date),
                extract("month", ReportModel.payment_date),
            )
            .order_by(
                extract("year", ReportModel.payment_date),
                extract("month", ReportModel.payment_date),
            )
        )

        result = await self._reports_session.execute(stmt)
        rows = result.all()
        return [
            {
                "month": int(row.month),
                "year": int(row.year),
                "total_revenue": Decimal(str(row.total_revenue or "0")),
            }
            for row in rows
        ]

    async def get_dashboard_metrics(self) -> dict:
        now = datetime.now(tz=timezone.utc)
        today = now.date()

        # Use rolling 30-day windows so metrics don't reset to $0 at month boundaries.
        # "current period"  = last 30 days  (today-30 .. today)
        # "previous period" = prior 30 days (today-60 .. today-31)
        period_start = today - timedelta(days=30)
        prev_period_start = today - timedelta(days=60)
        prev_period_end = today - timedelta(days=31)

        # Total reservations (all time)
        count_stmt = select(func.count()).select_from(ReportModel)
        count_result = await self._reports_session.execute(count_stmt)
        total_reservations = count_result.scalar_one() or 0

        # Revenue for the last 30 days
        monthly_stmt = select(func.sum(ReportModel.gross_value)).where(
            func.date(ReportModel.payment_date) >= period_start,
            func.date(ReportModel.payment_date) <= today,
        )
        monthly_result = await self._reports_session.execute(monthly_stmt)
        monthly_revenue = Decimal(str(monthly_result.scalar_one() or "0"))

        # Revenue for the previous 30-day window (for trend comparison)
        prev_stmt = select(func.sum(ReportModel.gross_value)).where(
            func.date(ReportModel.payment_date) >= prev_period_start,
            func.date(ReportModel.payment_date) <= prev_period_end,
        )
        prev_result = await self._reports_session.execute(prev_stmt)
        prev_revenue = Decimal(str(prev_result.scalar_one() or "0"))

        # Revenue trend percentage
        if prev_revenue == Decimal("0"):
            revenue_trend_pct = 0.0
        else:
            revenue_trend_pct = round(
                float((monthly_revenue - prev_revenue) / prev_revenue * 100), 1
            )

        # Avg daily revenue over the 30-day window
        avg_daily_revenue = round(float(monthly_revenue) / 30, 2)

        # Today's check-ins (payment_date == today)
        checkins_stmt = select(func.count()).select_from(ReportModel).where(
            ReportModel.payment_date == today
        )
        checkins_result = await self._reports_session.execute(checkins_stmt)
        today_checkins = checkins_result.scalar_one() or 0

        # Today's check-outs (update_date == today)
        checkouts_stmt = select(func.count()).select_from(ReportModel).where(
            ReportModel.update_date == today
        )
        checkouts_result = await self._reports_session.execute(checkouts_stmt)
        today_checkouts = checkouts_result.scalar_one() or 0

        return {
            "total_reservations": total_reservations,
            "monthly_revenue": monthly_revenue,
            "avg_daily_revenue": avg_daily_revenue,
            "revenue_trend_pct": revenue_trend_pct,
            "today_checkins": today_checkins,
            "today_checkouts": today_checkouts,
        }

    # ------------------------------------------------------------------
    # Mapping helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _billing_to_domain(m: BillingModel) -> BillingRecord:
        return BillingRecord(
            id=m.id,
            booking_id=m.booking_id,
            value=m.value,
            state=m.state,
            payment_reference=m.payment_reference,
            payment_date=m.payment_date,
            update_date=m.update_date,
            admin_group_id=m.admin_group_id,
            reason=m.reason,
        )

    @staticmethod
    def _report_to_domain(m: ReportModel) -> ReportRecord:
        return ReportRecord(
            id=m.id,
            booking_id=m.booking_id,
            payment_reference=m.payment_reference,
            payment_date=m.payment_date,
            update_date=m.update_date,
            admin_group_id=m.admin_group_id,
            gross_value=m.gross_value,
            taxes=m.taxes,
            commission=m.commission,
            net_income=m.net_income,
            status=m.status,
            created_at=m.created_at,
        )
