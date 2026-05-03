from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from incomings_report.application.get_csv_report import GetCsvReportUseCase
from incomings_report.application.get_dashboard_metrics import GetDashboardMetricsUseCase
from incomings_report.application.get_revenue_overview import GetRevenueOverviewUseCase
from incomings_report.application.sync_and_get_report import SyncAndGetReportUseCase
from incomings_report.database import get_billing_session, get_reports_session
from incomings_report.infrastructure.sqlalchemy_report_repo import SqlAlchemyReportRepository

ReportsSessionDep = Annotated[AsyncSession, Depends(get_reports_session)]
BillingSessionDep = Annotated[AsyncSession, Depends(get_billing_session)]


def get_report_repository(
    reports_session: ReportsSessionDep,
    billing_session: BillingSessionDep,
) -> SqlAlchemyReportRepository:
    return SqlAlchemyReportRepository(
        reports_session=reports_session,
        billing_session=billing_session,
    )


RepoDep = Annotated[SqlAlchemyReportRepository, Depends(get_report_repository)]


def get_sync_and_get_report_use_case(repo: RepoDep) -> SyncAndGetReportUseCase:
    return SyncAndGetReportUseCase(repo=repo)


def get_revenue_overview_use_case(repo: RepoDep) -> GetRevenueOverviewUseCase:
    return GetRevenueOverviewUseCase(repo=repo)


def get_dashboard_metrics_use_case(repo: RepoDep) -> GetDashboardMetricsUseCase:
    return GetDashboardMetricsUseCase(repo=repo)


def get_csv_report_use_case(repo: RepoDep) -> GetCsvReportUseCase:
    return GetCsvReportUseCase(repo=repo)
