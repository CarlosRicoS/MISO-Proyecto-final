"""
Unit tests for GetRevenueOverviewUseCase.

Covers:
  - AC-3: GET /revenue-overview returns monthly aggregation array with
          month, year, label, total_revenue
  - AC-7: use case returns results (not a timing test)
"""

from datetime import date
from decimal import Decimal

import pytest

from incomings_report.application.commands import GetRevenueOverviewQuery
from incomings_report.application.get_revenue_overview import GetRevenueOverviewUseCase
from incomings_report.infrastructure.in_memory_report_repo import InMemoryReportRepository
from tests.conftest import (
    CURRENT_MONTH,
    CURRENT_YEAR,
    PREV_MONTH,
    PREV_YEAR,
    make_report_record,
)


class TestGetRevenueOverviewUseCase:

    # ------------------------------------------------------------------
    # Response shape (AC-3)
    # ------------------------------------------------------------------

    async def test_returns_list_of_dicts(self, repo_with_reports: InMemoryReportRepository):
        use_case = GetRevenueOverviewUseCase(repo=repo_with_reports)
        result = await use_case.execute(GetRevenueOverviewQuery(months=6))
        assert isinstance(result, list)

    async def test_each_item_has_required_keys(self, repo_with_reports: InMemoryReportRepository):
        """AC-3: each dict must contain month, year, label, total_revenue."""
        use_case = GetRevenueOverviewUseCase(repo=repo_with_reports)
        result = await use_case.execute(GetRevenueOverviewQuery(months=6))
        for item in result:
            assert "month" in item
            assert "year" in item
            assert "label" in item
            assert "total_revenue" in item

    async def test_label_is_short_month_abbreviation(self, repo_with_reports: InMemoryReportRepository):
        """Label should be one of the 12 English abbreviations."""
        valid_labels = {
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        }
        use_case = GetRevenueOverviewUseCase(repo=repo_with_reports)
        result = await use_case.execute(GetRevenueOverviewQuery(months=12))
        for item in result:
            assert item["label"] in valid_labels

    async def test_results_ordered_chronologically(self):
        """Items must be sorted by (year, month)."""
        reports = [
            make_report_record(
                booking_id="b1",
                gross_value=Decimal("100.00"),
                payment_date=date(CURRENT_YEAR, CURRENT_MONTH, 1),
            ),
            make_report_record(
                booking_id="b2",
                gross_value=Decimal("200.00"),
                payment_date=date(PREV_YEAR, PREV_MONTH, 1),
            ),
        ]
        repo = InMemoryReportRepository(report_records=reports)
        use_case = GetRevenueOverviewUseCase(repo=repo)
        result = await use_case.execute(GetRevenueOverviewQuery(months=12))

        years_months = [(r["year"], r["month"]) for r in result]
        assert years_months == sorted(years_months)

    # ------------------------------------------------------------------
    # Aggregation correctness
    # ------------------------------------------------------------------

    async def test_aggregates_same_month_records(self):
        """Two records in the same month should sum their gross values."""
        reports = [
            make_report_record(
                booking_id="b1",
                gross_value=Decimal("1000.00"),
                payment_date=date(CURRENT_YEAR, CURRENT_MONTH, 1),
            ),
            make_report_record(
                booking_id="b2",
                gross_value=Decimal("500.00"),
                payment_date=date(CURRENT_YEAR, CURRENT_MONTH, 15),
            ),
        ]
        repo = InMemoryReportRepository(report_records=reports)
        use_case = GetRevenueOverviewUseCase(repo=repo)
        result = await use_case.execute(GetRevenueOverviewQuery(months=2))

        # Find the current month entry
        current_month_entries = [
            r for r in result if r["month"] == CURRENT_MONTH and r["year"] == CURRENT_YEAR
        ]
        assert len(current_month_entries) == 1
        assert current_month_entries[0]["total_revenue"] == Decimal("1500.00")

    async def test_months_param_limits_date_range(self):
        """months=1 should only include the current month."""
        reports = [
            make_report_record(
                booking_id="b-current",
                gross_value=Decimal("1000.00"),
                payment_date=date(CURRENT_YEAR, CURRENT_MONTH, 1),
            ),
            make_report_record(
                booking_id="b-old",
                gross_value=Decimal("999.00"),
                payment_date=date(PREV_YEAR, PREV_MONTH, 1),
            ),
        ]
        repo = InMemoryReportRepository(report_records=reports)
        use_case = GetRevenueOverviewUseCase(repo=repo)
        result = await use_case.execute(GetRevenueOverviewQuery(months=1))

        # Only current month entries
        for item in result:
            assert (item["year"], item["month"]) == (CURRENT_YEAR, CURRENT_MONTH)

    async def test_empty_repo_returns_empty_list(self):
        repo = InMemoryReportRepository()
        use_case = GetRevenueOverviewUseCase(repo=repo)
        result = await use_case.execute(GetRevenueOverviewQuery(months=6))
        assert result == []

    async def test_default_months_is_six(self, repo_with_reports: InMemoryReportRepository):
        """GetRevenueOverviewQuery default months value should be 6."""
        query = GetRevenueOverviewQuery()
        assert query.months == 6
        # Call executes without error
        use_case = GetRevenueOverviewUseCase(repo=repo_with_reports)
        result = await use_case.execute(query)
        assert isinstance(result, list)

    # ------------------------------------------------------------------
    # AC-7: use case returns a result (performance correctness, not timing)
    # ------------------------------------------------------------------

    async def test_returns_result_for_12_months(self):
        """AC-7: the use case responds for up to 12 months of data."""
        reports = [
            make_report_record(
                booking_id=f"b{i}",
                gross_value=Decimal("100.00"),
                payment_date=date(CURRENT_YEAR, CURRENT_MONTH, 1),
            )
            for i in range(50)
        ]
        repo = InMemoryReportRepository(report_records=reports)
        use_case = GetRevenueOverviewUseCase(repo=repo)
        result = await use_case.execute(GetRevenueOverviewQuery(months=12))
        assert isinstance(result, list)
        # All 50 records in the same month, so one aggregated entry
        assert len(result) == 1
        assert result[0]["total_revenue"] == Decimal("5000.00")

    # ------------------------------------------------------------------
    # Label correctness for all months
    # ------------------------------------------------------------------

    async def test_label_matches_month_number(self):
        """Verify the month-to-label mapping for a known month."""
        month_labels = {
            1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
            7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec",
        }
        reports = [
            make_report_record(
                booking_id="b1",
                gross_value=Decimal("100.00"),
                payment_date=date(CURRENT_YEAR, CURRENT_MONTH, 1),
            )
        ]
        repo = InMemoryReportRepository(report_records=reports)
        use_case = GetRevenueOverviewUseCase(repo=repo)
        result = await use_case.execute(GetRevenueOverviewQuery(months=12))

        for item in result:
            expected_label = month_labels[item["month"]]
            assert item["label"] == expected_label
