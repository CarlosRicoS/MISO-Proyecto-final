import csv
import io
from collections.abc import AsyncGenerator

from incomings_report.application.commands import GetCsvReportQuery
from incomings_report.application.ports import ReportRepository

_CSV_HEADERS = [
    "Date",
    "Booking Code",
    "Gross Rate",
    "Taxes (7.5%)",
    "TravelHub Commission (5%)",
    "Net Income",
    "Status",
]


class GetCsvReportUseCase:
    """
    Yields CSV rows as strings for streaming via FastAPI StreamingResponse.
    Includes a UTF-8 BOM as the very first chunk for Excel compatibility.
    """

    def __init__(self, repo: ReportRepository) -> None:
        self._repo = repo

    async def execute(self, query: GetCsvReportQuery) -> AsyncGenerator[str]:
        records = await self._repo.get_all_reports(
            start_date=query.start_date,
            end_date=query.end_date,
        )

        buf = io.StringIO()
        buf.write("﻿")  # UTF-8 BOM

        writer = csv.writer(buf)
        writer.writerow(_CSV_HEADERS)
        yield buf.getvalue()

        for record in records:
            buf = io.StringIO()
            writer = csv.writer(buf)
            writer.writerow([
                record.payment_date.isoformat() if record.payment_date else "",
                record.booking_id,
                record.gross_value,
                record.taxes,
                record.commission,
                record.net_income,
                record.status or "",
            ])
            yield buf.getvalue()
