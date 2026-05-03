from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class GetIncomingReportQuery:
    start_date: date | None = None
    end_date: date | None = None


@dataclass(frozen=True)
class GetRevenueOverviewQuery:
    months: int = 6


@dataclass(frozen=True)
class GetDashboardMetricsQuery:
    pass


@dataclass(frozen=True)
class GetCsvReportQuery:
    start_date: date | None = None
    end_date: date | None = None
