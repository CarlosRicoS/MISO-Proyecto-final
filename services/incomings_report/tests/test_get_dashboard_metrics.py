"""
Unit tests for GetDashboardMetricsUseCase.

Covers:
  - AC-4: GET /dashboard-metrics returns KPI object with all required fields
"""

from datetime import date, timedelta
from decimal import Decimal

import pytest

from incomings_report.application.commands import GetDashboardMetricsQuery
from incomings_report.application.get_dashboard_metrics import GetDashboardMetricsUseCase
from incomings_report.infrastructure.in_memory_report_repo import InMemoryReportRepository
from tests.conftest import (
    TODAY,
    make_report_record,
)

# Dates relative to the rolling 30-day windows used by get_dashboard_metrics.
DATE_IN_WINDOW = TODAY - timedelta(days=5)       # last 30 days (current period)
DATE_IN_PREV_WINDOW = TODAY - timedelta(days=40) # 30-60 days ago (previous period)
DATE_OLD = TODAY - timedelta(days=90)            # well outside both windows


class TestGetDashboardMetricsUseCase:

    # ------------------------------------------------------------------
    # Response shape (AC-4)
    # ------------------------------------------------------------------

    async def test_returns_dict_with_all_required_fields(self):
        """AC-4: result must contain all six KPI fields."""
        repo = InMemoryReportRepository(
            report_records=[make_report_record(booking_id="b1")]
        )
        use_case = GetDashboardMetricsUseCase(repo=repo)
        result = await use_case.execute(GetDashboardMetricsQuery())

        assert "total_reservations" in result
        assert "monthly_revenue" in result
        assert "avg_daily_revenue" in result
        assert "revenue_trend_pct" in result
        assert "today_checkins" in result
        assert "today_checkouts" in result

    async def test_total_reservations_counts_all_records(self):
        reports = [
            make_report_record(booking_id="b1"),
            make_report_record(booking_id="b2"),
            make_report_record(booking_id="b3"),
        ]
        repo = InMemoryReportRepository(report_records=reports)
        use_case = GetDashboardMetricsUseCase(repo=repo)
        result = await use_case.execute(GetDashboardMetricsQuery())

        assert result["total_reservations"] == 3

    async def test_empty_repo_returns_zero_metrics(self):
        repo = InMemoryReportRepository()
        use_case = GetDashboardMetricsUseCase(repo=repo)
        result = await use_case.execute(GetDashboardMetricsQuery())

        assert result["total_reservations"] == 0
        assert result["monthly_revenue"] == Decimal("0")
        assert result["avg_daily_revenue"] == 0.0
        assert result["revenue_trend_pct"] == 0.0
        assert result["today_checkins"] == 0
        assert result["today_checkouts"] == 0

    # ------------------------------------------------------------------
    # Monthly revenue calculation
    # ------------------------------------------------------------------

    async def test_monthly_revenue_sums_current_window_records(self):
        reports = [
            make_report_record(
                booking_id="b-current",
                gross_value=Decimal("1000.00"),
                payment_date=DATE_IN_WINDOW,
            ),
            make_report_record(
                booking_id="b-old",
                gross_value=Decimal("9999.00"),
                payment_date=DATE_OLD,
            ),
        ]
        repo = InMemoryReportRepository(report_records=reports)
        use_case = GetDashboardMetricsUseCase(repo=repo)
        result = await use_case.execute(GetDashboardMetricsQuery())

        assert result["monthly_revenue"] == Decimal("1000.00")

    async def test_monthly_revenue_excludes_records_without_payment_date(self):
        from incomings_report.domain.entities import ReportRecord
        from uuid import uuid4

        reports = [
            make_report_record(
                booking_id="b-with-date",
                gross_value=Decimal("500.00"),
                payment_date=DATE_IN_WINDOW,
            ),
            # Explicitly build a record with payment_date=None
            ReportRecord(
                id=uuid4(),
                booking_id="b-no-date",
                gross_value=Decimal("9999.00"),
                taxes=Decimal("750.00"),
                commission=Decimal("500.00"),
                net_income=Decimal("8749.00"),
                payment_date=None,
                status="CONFIRMED",
            ),
        ]
        repo = InMemoryReportRepository(report_records=reports)
        use_case = GetDashboardMetricsUseCase(repo=repo)
        result = await use_case.execute(GetDashboardMetricsQuery())

        assert result["monthly_revenue"] == Decimal("500.00")

    # ------------------------------------------------------------------
    # Revenue trend percentage
    # ------------------------------------------------------------------

    async def test_revenue_trend_pct_positive_when_current_window_higher(self):
        reports = [
            make_report_record(
                booking_id="b-current",
                gross_value=Decimal("1000.00"),
                payment_date=DATE_IN_WINDOW,
            ),
            make_report_record(
                booking_id="b-prev",
                gross_value=Decimal("500.00"),
                payment_date=DATE_IN_PREV_WINDOW,
            ),
        ]
        repo = InMemoryReportRepository(report_records=reports)
        use_case = GetDashboardMetricsUseCase(repo=repo)
        result = await use_case.execute(GetDashboardMetricsQuery())

        # (1000 - 500) / 500 * 100 = 100.0
        assert result["revenue_trend_pct"] == 100.0

    async def test_revenue_trend_pct_negative_when_current_window_lower(self):
        reports = [
            make_report_record(
                booking_id="b-current",
                gross_value=Decimal("500.00"),
                payment_date=DATE_IN_WINDOW,
            ),
            make_report_record(
                booking_id="b-prev",
                gross_value=Decimal("1000.00"),
                payment_date=DATE_IN_PREV_WINDOW,
            ),
        ]
        repo = InMemoryReportRepository(report_records=reports)
        use_case = GetDashboardMetricsUseCase(repo=repo)
        result = await use_case.execute(GetDashboardMetricsQuery())

        # (500 - 1000) / 1000 * 100 = -50.0
        assert result["revenue_trend_pct"] == -50.0

    async def test_revenue_trend_pct_zero_when_no_previous_window_data(self):
        """When previous 30-day window revenue is 0, trend should be 0 (no division by zero)."""
        reports = [
            make_report_record(
                booking_id="b-current",
                gross_value=Decimal("1000.00"),
                payment_date=DATE_IN_WINDOW,
            ),
        ]
        repo = InMemoryReportRepository(report_records=reports)
        use_case = GetDashboardMetricsUseCase(repo=repo)
        result = await use_case.execute(GetDashboardMetricsQuery())

        assert result["revenue_trend_pct"] == 0.0

    # ------------------------------------------------------------------
    # Average daily revenue
    # ------------------------------------------------------------------

    async def test_avg_daily_revenue_is_monthly_revenue_over_30_days(self):
        reports = [
            make_report_record(
                booking_id="b1",
                gross_value=Decimal("3000.00"),
                payment_date=DATE_IN_WINDOW,
            ),
        ]
        repo = InMemoryReportRepository(report_records=reports)
        use_case = GetDashboardMetricsUseCase(repo=repo)
        result = await use_case.execute(GetDashboardMetricsQuery())

        expected = round(3000.0 / 30, 2)
        assert result["avg_daily_revenue"] == expected

    # ------------------------------------------------------------------
    # Today check-ins / check-outs
    # ------------------------------------------------------------------

    async def test_today_checkins_counts_records_with_payment_date_today(self):
        reports = [
            make_report_record(
                booking_id="b-today",
                gross_value=Decimal("100.00"),
                payment_date=TODAY,
            ),
            make_report_record(
                booking_id="b-not-today",
                gross_value=Decimal("100.00"),
                payment_date=date(2020, 1, 1),
            ),
        ]
        repo = InMemoryReportRepository(report_records=reports)
        use_case = GetDashboardMetricsUseCase(repo=repo)
        result = await use_case.execute(GetDashboardMetricsQuery())

        assert result["today_checkins"] == 1

    async def test_today_checkouts_counts_records_with_update_date_today(self):
        reports = [
            make_report_record(
                booking_id="b-checkout-today",
                gross_value=Decimal("100.00"),
                payment_date=date(2025, 1, 1),
                update_date=TODAY,
            ),
            make_report_record(
                booking_id="b-no-checkout",
                gross_value=Decimal("100.00"),
                payment_date=date(2025, 1, 1),
                update_date=None,
            ),
        ]
        repo = InMemoryReportRepository(report_records=reports)
        use_case = GetDashboardMetricsUseCase(repo=repo)
        result = await use_case.execute(GetDashboardMetricsQuery())

        assert result["today_checkouts"] == 1

    async def test_total_reservations_is_integer(self):
        repo = InMemoryReportRepository(
            report_records=[make_report_record()]
        )
        use_case = GetDashboardMetricsUseCase(repo=repo)
        result = await use_case.execute(GetDashboardMetricsQuery())
        assert isinstance(result["total_reservations"], int)
