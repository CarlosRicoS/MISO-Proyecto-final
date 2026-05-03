from incomings_report.application.commands import GetRevenueOverviewQuery
from incomings_report.application.ports import ReportRepository

_MONTH_LABELS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]


class GetRevenueOverviewUseCase:
    """
    Returns monthly aggregated gross revenue for the last N months.
    Results are suitable for direct use as a bar chart data source.
    """

    def __init__(self, repo: ReportRepository) -> None:
        self._repo = repo

    async def execute(self, query: GetRevenueOverviewQuery) -> list[dict]:
        rows = await self._repo.get_revenue_overview(months=query.months)
        for row in rows:
            month_idx = int(row["month"]) - 1
            row["label"] = _MONTH_LABELS[month_idx]
        return rows
