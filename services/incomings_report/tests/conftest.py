"""
Shared fixtures for the incomings_report test suite.

Fixtures:
  - empty_repo: InMemoryReportRepository with no data
  - repo_with_billing: repo seeded with sample BillingRecord objects
  - repo_with_reports: repo seeded with sample ReportRecord objects
  - client: FastAPI TestClient with dependency overrides injecting in-memory repo
"""

from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from incomings_report.application.get_csv_report import GetCsvReportUseCase
from incomings_report.application.get_dashboard_metrics import GetDashboardMetricsUseCase
from incomings_report.application.get_revenue_overview import GetRevenueOverviewUseCase
from incomings_report.application.sync_and_get_report import SyncAndGetReportUseCase
from incomings_report.bootstrap import (
    get_csv_report_use_case,
    get_dashboard_metrics_use_case,
    get_revenue_overview_use_case,
    get_sync_and_get_report_use_case,
)
from incomings_report.domain.entities import BillingRecord, ReportRecord
from incomings_report.infrastructure.in_memory_report_repo import InMemoryReportRepository
from incomings_report.main import create_app

# ---------------------------------------------------------------------------
# Sample data helpers
# ---------------------------------------------------------------------------

TODAY = datetime.now(tz=timezone.utc).date()
CURRENT_YEAR = TODAY.year
CURRENT_MONTH = TODAY.month
PREV_MONTH = 12 if CURRENT_MONTH == 1 else CURRENT_MONTH - 1
PREV_YEAR = CURRENT_YEAR - 1 if CURRENT_MONTH == 1 else CURRENT_YEAR


def make_billing_record(
    booking_id: str = "booking-001",
    value: Decimal = Decimal("1000.00"),
    state: str = "CONFIRMED",
    payment_date: datetime | None = None,
    update_date: datetime | None = None,
    payment_reference: str = "PAY-REF-001",
    admin_group_id: str | None = "admin-group-001",
) -> BillingRecord:
    if payment_date is None:
        payment_date = datetime(CURRENT_YEAR, CURRENT_MONTH, 15, tzinfo=timezone.utc)
    return BillingRecord(
        id=str(uuid4()),
        booking_id=booking_id,
        value=value,
        state=state,
        payment_reference=payment_reference,
        payment_date=payment_date,
        update_date=update_date,
        admin_group_id=admin_group_id,
    )


def make_report_record(
    booking_id: str = "booking-001",
    gross_value: Decimal = Decimal("1000.00"),
    payment_date: date | None = None,
    update_date: date | None = None,
    status: str = "CONFIRMED",
) -> ReportRecord:
    if payment_date is None:
        payment_date = date(CURRENT_YEAR, CURRENT_MONTH, 15)
    taxes = (gross_value * Decimal("0.075")).quantize(Decimal("0.01"))
    commission = (gross_value * Decimal("0.05")).quantize(Decimal("0.01"))
    net_income = gross_value - taxes - commission
    return ReportRecord(
        id=uuid4(),
        booking_id=booking_id,
        gross_value=gross_value,
        taxes=taxes,
        commission=commission,
        net_income=net_income,
        payment_date=payment_date,
        update_date=update_date,
        status=status,
        payment_reference="PAY-REF-001",
        admin_group_id="admin-group-001",
    )


# ---------------------------------------------------------------------------
# Repository fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def empty_repo() -> InMemoryReportRepository:
    return InMemoryReportRepository()


@pytest.fixture
def repo_with_billing() -> InMemoryReportRepository:
    billing = [
        make_billing_record(booking_id="booking-001", value=Decimal("1000.00")),
        make_billing_record(
            booking_id="booking-002",
            value=Decimal("2000.00"),
            state="COMPLETED",
            payment_date=datetime(CURRENT_YEAR, CURRENT_MONTH, 10, tzinfo=timezone.utc),
        ),
        make_billing_record(
            booking_id="booking-003",
            value=Decimal("500.00"),
            state="CANCELLED",
            payment_date=datetime(PREV_YEAR, PREV_MONTH, 5, tzinfo=timezone.utc),
        ),
    ]
    return InMemoryReportRepository(billing_records=billing)


@pytest.fixture
def repo_with_reports() -> InMemoryReportRepository:
    reports = [
        make_report_record(booking_id="booking-001", gross_value=Decimal("1000.00")),
        make_report_record(
            booking_id="booking-002",
            gross_value=Decimal("2000.00"),
            status="COMPLETED",
            payment_date=date(CURRENT_YEAR, CURRENT_MONTH, 10),
        ),
        make_report_record(
            booking_id="booking-003",
            gross_value=Decimal("500.00"),
            status="CANCELLED",
            payment_date=date(PREV_YEAR, PREV_MONTH, 5),
        ),
    ]
    return InMemoryReportRepository(report_records=reports)


# ---------------------------------------------------------------------------
# FastAPI TestClient fixture with dependency overrides
# ---------------------------------------------------------------------------


def make_client(repo: InMemoryReportRepository) -> TestClient:
    """Build a TestClient whose use-case deps are wired to the given repo."""
    app = create_app()

    app.dependency_overrides[get_sync_and_get_report_use_case] = (
        lambda: SyncAndGetReportUseCase(repo=repo)
    )
    app.dependency_overrides[get_revenue_overview_use_case] = (
        lambda: GetRevenueOverviewUseCase(repo=repo)
    )
    app.dependency_overrides[get_dashboard_metrics_use_case] = (
        lambda: GetDashboardMetricsUseCase(repo=repo)
    )
    app.dependency_overrides[get_csv_report_use_case] = (
        lambda: GetCsvReportUseCase(repo=repo)
    )

    return TestClient(app)


@pytest.fixture
def client(repo_with_reports: InMemoryReportRepository) -> TestClient:
    """TestClient seeded with 3 report records (no billing — synced already)."""
    return make_client(repo_with_reports)


@pytest.fixture
def client_with_billing(repo_with_billing: InMemoryReportRepository) -> TestClient:
    """TestClient seeded with raw billing records (triggers sync on first call)."""
    return make_client(repo_with_billing)


@pytest.fixture
def empty_client(empty_repo: InMemoryReportRepository) -> TestClient:
    """TestClient with no data at all."""
    return make_client(empty_repo)
