from datetime import date
from typing import Protocol

from incomings_report.domain.entities import BillingRecord, ReportRecord


class ReportRepository(Protocol):
    """Port for report persistence and billing read access."""

    async def get_all_billing(
        self,
        start_date: date | None,
        end_date: date | None,
    ) -> list[BillingRecord]: ...

    async def upsert_reports(self, records: list[ReportRecord]) -> None: ...

    async def get_all_reports(
        self,
        start_date: date | None,
        end_date: date | None,
    ) -> list[ReportRecord]: ...

    async def get_revenue_overview(self, months: int) -> list[dict]: ...

    async def get_dashboard_metrics(self) -> dict: ...
