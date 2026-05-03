"""
Unit tests for SyncAndGetReportUseCase.

Covers:
  - AC-2: upsert from billing with 7.5% tax + 5% commission formula
  - AC-1: returned records include all required fields
"""

from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

import pytest

from incomings_report.application.commands import GetIncomingReportQuery
from incomings_report.application.sync_and_get_report import (
    IncomingReportResult,
    SyncAndGetReportUseCase,
)
from incomings_report.domain.entities import BillingRecord
from incomings_report.infrastructure.in_memory_report_repo import InMemoryReportRepository
from tests.conftest import make_billing_record


class TestSyncAndGetReportUseCase:

    # ------------------------------------------------------------------
    # Formula: taxes = 7.5%, commission = 5%, net = gross - taxes - comm
    # ------------------------------------------------------------------

    async def test_computes_taxes_correctly(self):
        repo = InMemoryReportRepository(
            billing_records=[make_billing_record(booking_id="b1", value=Decimal("1000.00"))]
        )
        use_case = SyncAndGetReportUseCase(repo=repo)
        result = await use_case.execute(GetIncomingReportQuery())

        assert len(result.records) == 1
        record = result.records[0]
        assert record.taxes == Decimal("75.00")  # 7.5% of 1000

    async def test_computes_commission_correctly(self):
        repo = InMemoryReportRepository(
            billing_records=[make_billing_record(booking_id="b1", value=Decimal("1000.00"))]
        )
        use_case = SyncAndGetReportUseCase(repo=repo)
        result = await use_case.execute(GetIncomingReportQuery())

        assert result.records[0].commission == Decimal("50.00")  # 5% of 1000

    async def test_computes_net_income_correctly(self):
        repo = InMemoryReportRepository(
            billing_records=[make_billing_record(booking_id="b1", value=Decimal("1000.00"))]
        )
        use_case = SyncAndGetReportUseCase(repo=repo)
        result = await use_case.execute(GetIncomingReportQuery())

        # net = 1000 - 75 - 50 = 875
        assert result.records[0].net_income == Decimal("875.00")

    async def test_formula_with_non_round_value(self):
        """Verify rounding to 2 decimal places on fractional amounts."""
        repo = InMemoryReportRepository(
            billing_records=[make_billing_record(booking_id="b1", value=Decimal("333.33"))]
        )
        use_case = SyncAndGetReportUseCase(repo=repo)
        result = await use_case.execute(GetIncomingReportQuery())

        record = result.records[0]
        # taxes = 333.33 * 0.075 = 24.999... → rounds to 25.00
        assert record.taxes == Decimal("25.00")
        # commission = 333.33 * 0.05 = 16.666... → rounds to 16.67
        assert record.commission == Decimal("16.67")
        assert record.net_income == record.gross_value - record.taxes - record.commission

    async def test_result_contains_required_fields(self):
        """AC-1: returned records include all required fields."""
        billing = make_billing_record(
            booking_id="b-required-fields",
            value=Decimal("500.00"),
            state="CONFIRMED",
            payment_reference="PAY-REF-XYZ",
        )
        repo = InMemoryReportRepository(billing_records=[billing])
        use_case = SyncAndGetReportUseCase(repo=repo)
        result = await use_case.execute(GetIncomingReportQuery())

        record = result.records[0]
        assert record.booking_id == "b-required-fields"
        assert record.payment_reference == "PAY-REF-XYZ"
        assert record.gross_value == Decimal("500.00")
        assert record.taxes is not None
        assert record.commission is not None
        assert record.net_income is not None
        assert record.status == "CONFIRMED"
        assert record.id is not None

    # ------------------------------------------------------------------
    # Aggregate totals
    # ------------------------------------------------------------------

    async def test_total_records_count(self):
        billing = [
            make_billing_record(booking_id="b1", value=Decimal("100.00")),
            make_billing_record(booking_id="b2", value=Decimal("200.00")),
        ]
        repo = InMemoryReportRepository(billing_records=billing)
        use_case = SyncAndGetReportUseCase(repo=repo)
        result = await use_case.execute(GetIncomingReportQuery())

        assert result.total_records == 2

    async def test_total_gross_sum(self):
        billing = [
            make_billing_record(booking_id="b1", value=Decimal("100.00")),
            make_billing_record(booking_id="b2", value=Decimal("200.00")),
        ]
        repo = InMemoryReportRepository(billing_records=billing)
        use_case = SyncAndGetReportUseCase(repo=repo)
        result = await use_case.execute(GetIncomingReportQuery())

        assert result.total_gross == Decimal("300.00")

    async def test_total_net_sum(self):
        billing = [
            make_billing_record(booking_id="b1", value=Decimal("1000.00")),
        ]
        repo = InMemoryReportRepository(billing_records=billing)
        use_case = SyncAndGetReportUseCase(repo=repo)
        result = await use_case.execute(GetIncomingReportQuery())

        # net = 875; total_net should equal that
        assert result.total_net == Decimal("875.00")

    async def test_result_is_incoming_report_result_instance(self):
        repo = InMemoryReportRepository(billing_records=[make_billing_record()])
        use_case = SyncAndGetReportUseCase(repo=repo)
        result = await use_case.execute(GetIncomingReportQuery())
        assert isinstance(result, IncomingReportResult)

    # ------------------------------------------------------------------
    # Upsert idempotency (AC-2)
    # ------------------------------------------------------------------

    async def test_upsert_is_idempotent(self):
        """Calling execute twice on same billing records should not duplicate reports."""
        billing = [make_billing_record(booking_id="b1", value=Decimal("1000.00"))]
        repo = InMemoryReportRepository(billing_records=billing)
        use_case = SyncAndGetReportUseCase(repo=repo)

        await use_case.execute(GetIncomingReportQuery())
        result = await use_case.execute(GetIncomingReportQuery())

        # Still only one record after two syncs
        assert result.total_records == 1

    async def test_upsert_updates_existing_record_on_value_change(self):
        """Billing value change on second call is reflected in the report."""
        billing = [make_billing_record(booking_id="b1", value=Decimal("1000.00"))]
        repo = InMemoryReportRepository(billing_records=billing)
        use_case = SyncAndGetReportUseCase(repo=repo)
        await use_case.execute(GetIncomingReportQuery())

        # Change the billing value in-place
        repo._billing[0] = make_billing_record(booking_id="b1", value=Decimal("2000.00"))
        result = await use_case.execute(GetIncomingReportQuery())

        assert result.records[0].gross_value == Decimal("2000.00")
        assert result.total_records == 1  # still only one record

    # ------------------------------------------------------------------
    # Edge cases
    # ------------------------------------------------------------------

    async def test_empty_billing_returns_empty_result(self):
        repo = InMemoryReportRepository()
        use_case = SyncAndGetReportUseCase(repo=repo)
        result = await use_case.execute(GetIncomingReportQuery())

        assert result.total_records == 0
        assert result.total_gross == Decimal("0")
        assert result.total_net == Decimal("0")
        assert result.records == []

    async def test_billing_record_without_booking_id_is_skipped(self):
        """Billing records with no booking_id must be ignored."""
        billing = [
            BillingRecord(
                id=str(uuid4()),
                booking_id=None,  # no booking_id
                value=Decimal("500.00"),
                state="CONFIRMED",
            ),
            make_billing_record(booking_id="b-valid", value=Decimal("100.00")),
        ]
        repo = InMemoryReportRepository(billing_records=billing)
        use_case = SyncAndGetReportUseCase(repo=repo)
        result = await use_case.execute(GetIncomingReportQuery())

        assert result.total_records == 1
        assert result.records[0].booking_id == "b-valid"

    async def test_billing_with_null_value_treated_as_zero(self):
        """BillingRecord with value=None should yield gross=0, taxes=0, commission=0."""
        billing = [
            BillingRecord(
                id=str(uuid4()),
                booking_id="b-null-value",
                value=None,
                state="CONFIRMED",
            )
        ]
        repo = InMemoryReportRepository(billing_records=billing)
        use_case = SyncAndGetReportUseCase(repo=repo)
        result = await use_case.execute(GetIncomingReportQuery())

        record = result.records[0]
        assert record.gross_value == Decimal("0.00")
        assert record.taxes == Decimal("0.00")
        assert record.commission == Decimal("0.00")
        assert record.net_income == Decimal("0.00")

    # ------------------------------------------------------------------
    # Date filtering
    # ------------------------------------------------------------------

    async def test_date_filter_start_date_excludes_earlier_records(self):
        from datetime import date

        billing = [
            make_billing_record(
                booking_id="b-old",
                value=Decimal("100.00"),
                payment_date=datetime(2024, 1, 5, tzinfo=timezone.utc),
            ),
            make_billing_record(
                booking_id="b-new",
                value=Decimal("200.00"),
                payment_date=datetime(2025, 6, 15, tzinfo=timezone.utc),
            ),
        ]
        repo = InMemoryReportRepository(billing_records=billing)
        use_case = SyncAndGetReportUseCase(repo=repo)
        result = await use_case.execute(
            GetIncomingReportQuery(start_date=date(2025, 1, 1))
        )

        assert result.total_records == 1
        assert result.records[0].booking_id == "b-new"

    async def test_date_filter_end_date_excludes_later_records(self):
        from datetime import date

        billing = [
            make_billing_record(
                booking_id="b-early",
                value=Decimal("100.00"),
                payment_date=datetime(2024, 1, 5, tzinfo=timezone.utc),
            ),
            make_billing_record(
                booking_id="b-late",
                value=Decimal("200.00"),
                payment_date=datetime(2025, 6, 15, tzinfo=timezone.utc),
            ),
        ]
        repo = InMemoryReportRepository(billing_records=billing)
        use_case = SyncAndGetReportUseCase(repo=repo)
        result = await use_case.execute(
            GetIncomingReportQuery(end_date=date(2024, 12, 31))
        )

        assert result.total_records == 1
        assert result.records[0].booking_id == "b-early"

    async def test_payment_date_is_converted_to_date_object(self):
        """Datetime from billing is converted to a plain date on the report record."""
        billing = [
            make_billing_record(
                booking_id="b1",
                payment_date=datetime(2025, 3, 10, 14, 30, tzinfo=timezone.utc),
            )
        ]
        repo = InMemoryReportRepository(billing_records=billing)
        use_case = SyncAndGetReportUseCase(repo=repo)
        result = await use_case.execute(GetIncomingReportQuery())

        import datetime as dt
        assert isinstance(result.records[0].payment_date, dt.date)
        assert result.records[0].payment_date.year == 2025
        assert result.records[0].payment_date.month == 3
        assert result.records[0].payment_date.day == 10
