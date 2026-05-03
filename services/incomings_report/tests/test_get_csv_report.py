"""
Unit tests for GetCsvReportUseCase.

Covers:
  - AC-5: streams UTF-8 BOM CSV with correct columns
"""

from datetime import date
from decimal import Decimal

import pytest

from incomings_report.application.commands import GetCsvReportQuery
from incomings_report.application.get_csv_report import GetCsvReportUseCase, _CSV_HEADERS
from incomings_report.infrastructure.in_memory_report_repo import InMemoryReportRepository
from tests.conftest import make_report_record


async def collect_csv(use_case: GetCsvReportUseCase, query: GetCsvReportQuery) -> str:
    """Fully consume the async generator and return the combined CSV string."""
    chunks = []
    async for chunk in use_case.execute(query):
        chunks.append(chunk)
    return "".join(chunks)


class TestGetCsvReportUseCase:

    # ------------------------------------------------------------------
    # UTF-8 BOM (AC-5)
    # ------------------------------------------------------------------

    async def test_first_chunk_starts_with_utf8_bom(self):
        """AC-5: the very first yielded chunk must start with the UTF-8 BOM."""
        repo = InMemoryReportRepository()
        use_case = GetCsvReportUseCase(repo=repo)

        chunks = []
        async for chunk in use_case.execute(GetCsvReportQuery()):
            chunks.append(chunk)
            break  # only need first chunk

        assert chunks[0].startswith("﻿")  # BOM character

    async def test_csv_content_encoded_to_bytes_starts_with_bom(self):
        """When encoded to bytes the CSV starts with the 3-byte BOM sequence."""
        repo = InMemoryReportRepository()
        use_case = GetCsvReportUseCase(repo=repo)
        csv_str = await collect_csv(use_case, GetCsvReportQuery())
        csv_bytes = csv_str.encode("utf-8")
        assert csv_bytes[:3] == b"\xef\xbb\xbf"

    # ------------------------------------------------------------------
    # CSV headers (AC-5)
    # ------------------------------------------------------------------

    async def test_csv_contains_all_required_columns(self):
        """Headers must match the SPEC: Date, Booking Code, Gross Rate, …"""
        repo = InMemoryReportRepository()
        use_case = GetCsvReportUseCase(repo=repo)
        csv_str = await collect_csv(use_case, GetCsvReportQuery())

        # Strip BOM from the start
        if csv_str.startswith("﻿"):
            csv_str = csv_str[1:]

        header_line = csv_str.splitlines()[0]
        for expected_col in _CSV_HEADERS:
            assert expected_col in header_line

    async def test_csv_header_order_matches_spec(self):
        """Column order: Date, Booking Code, Gross Rate, Taxes, Commission, Net Income, Status."""
        repo = InMemoryReportRepository()
        use_case = GetCsvReportUseCase(repo=repo)
        csv_str = await collect_csv(use_case, GetCsvReportQuery())

        if csv_str.startswith("﻿"):
            csv_str = csv_str[1:]

        import csv, io
        reader = csv.reader(io.StringIO(csv_str))
        header_row = next(reader)
        assert header_row == _CSV_HEADERS

    # ------------------------------------------------------------------
    # Data rows
    # ------------------------------------------------------------------

    async def test_csv_data_rows_contain_correct_values(self):
        """Each data row should map directly to a report record's fields."""
        reports = [
            make_report_record(
                booking_id="booking-csv-001",
                gross_value=Decimal("1000.00"),
                payment_date=date(2025, 6, 15),
                status="CONFIRMED",
            )
        ]
        repo = InMemoryReportRepository(report_records=reports)
        use_case = GetCsvReportUseCase(repo=repo)
        csv_str = await collect_csv(use_case, GetCsvReportQuery())

        if csv_str.startswith("﻿"):
            csv_str = csv_str[1:]

        import csv, io
        reader = csv.reader(io.StringIO(csv_str))
        next(reader)  # skip header
        row = next(reader)

        assert row[0] == "2025-06-15"  # Date
        assert row[1] == "booking-csv-001"  # Booking Code
        assert Decimal(row[2]) == Decimal("1000.00")  # Gross Rate
        assert Decimal(row[3]) == Decimal("75.00")  # Taxes
        assert Decimal(row[4]) == Decimal("50.00")  # Commission
        assert Decimal(row[5]) == Decimal("875.00")  # Net Income
        assert row[6] == "CONFIRMED"  # Status

    async def test_csv_row_empty_date_when_payment_date_is_none(self):
        """Records with no payment_date should have an empty Date cell."""
        from incomings_report.domain.entities import ReportRecord
        from decimal import Decimal
        from uuid import uuid4

        report = ReportRecord(
            id=uuid4(),
            booking_id="b-no-date",
            gross_value=Decimal("100.00"),
            taxes=Decimal("7.50"),
            commission=Decimal("5.00"),
            net_income=Decimal("87.50"),
            payment_date=None,
            status="CONFIRMED",
        )
        repo = InMemoryReportRepository(report_records=[report])
        use_case = GetCsvReportUseCase(repo=repo)
        csv_str = await collect_csv(use_case, GetCsvReportQuery())

        if csv_str.startswith("﻿"):
            csv_str = csv_str[1:]

        import csv, io
        reader = csv.reader(io.StringIO(csv_str))
        next(reader)  # header
        row = next(reader)
        assert row[0] == ""  # empty date

    async def test_csv_row_empty_status_when_status_is_none(self):
        """Records with no status should have an empty Status cell."""
        from incomings_report.domain.entities import ReportRecord
        from uuid import uuid4

        report = ReportRecord(
            id=uuid4(),
            booking_id="b-no-status",
            gross_value=Decimal("100.00"),
            taxes=Decimal("7.50"),
            commission=Decimal("5.00"),
            net_income=Decimal("87.50"),
            payment_date=date(2025, 1, 1),
            status=None,
        )
        repo = InMemoryReportRepository(report_records=[report])
        use_case = GetCsvReportUseCase(repo=repo)
        csv_str = await collect_csv(use_case, GetCsvReportQuery())

        if csv_str.startswith("﻿"):
            csv_str = csv_str[1:]

        import csv, io
        reader = csv.reader(io.StringIO(csv_str))
        next(reader)  # header
        row = next(reader)
        assert row[6] == ""

    async def test_csv_yields_header_even_for_empty_repo(self):
        """Even with no records the generator must yield the BOM + header."""
        repo = InMemoryReportRepository()
        use_case = GetCsvReportUseCase(repo=repo)
        csv_str = await collect_csv(use_case, GetCsvReportQuery())

        if csv_str.startswith("﻿"):
            csv_str = csv_str[1:]

        lines = [l for l in csv_str.splitlines() if l]
        assert len(lines) == 1  # only header line

    async def test_csv_multiple_records_produce_multiple_rows(self):
        reports = [
            make_report_record(booking_id="b1", gross_value=Decimal("100.00")),
            make_report_record(booking_id="b2", gross_value=Decimal("200.00")),
            make_report_record(booking_id="b3", gross_value=Decimal("300.00")),
        ]
        repo = InMemoryReportRepository(report_records=reports)
        use_case = GetCsvReportUseCase(repo=repo)
        csv_str = await collect_csv(use_case, GetCsvReportQuery())

        if csv_str.startswith("﻿"):
            csv_str = csv_str[1:]

        import csv, io
        reader = csv.reader(io.StringIO(csv_str))
        rows = list(reader)
        # 1 header + 3 data rows
        data_rows = [r for r in rows if r and r[0] != "Date"]
        assert len(data_rows) == 3

    # ------------------------------------------------------------------
    # Date filtering
    # ------------------------------------------------------------------

    async def test_csv_respects_start_date_filter(self):
        reports = [
            make_report_record(
                booking_id="b-included",
                gross_value=Decimal("100.00"),
                payment_date=date(2025, 6, 15),
            ),
            make_report_record(
                booking_id="b-excluded",
                gross_value=Decimal("200.00"),
                payment_date=date(2024, 1, 1),
            ),
        ]
        repo = InMemoryReportRepository(report_records=reports)
        use_case = GetCsvReportUseCase(repo=repo)
        csv_str = await collect_csv(
            use_case, GetCsvReportQuery(start_date=date(2025, 1, 1))
        )

        assert "b-included" in csv_str
        assert "b-excluded" not in csv_str
