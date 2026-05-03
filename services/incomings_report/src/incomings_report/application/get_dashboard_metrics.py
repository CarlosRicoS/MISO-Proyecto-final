from incomings_report.application.commands import GetDashboardMetricsQuery
from incomings_report.application.ports import ReportRepository


class GetDashboardMetricsUseCase:
    """
    Returns executive KPI metrics for the hotel admin dashboard.
    Derives all values from ReportsDB aggregate queries.
    """

    def __init__(self, repo: ReportRepository) -> None:
        self._repo = repo

    async def execute(self, query: GetDashboardMetricsQuery) -> dict:
        return await self._repo.get_dashboard_metrics()
