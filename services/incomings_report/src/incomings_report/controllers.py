from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.responses import StreamingResponse

from incomings_report.application.commands import (
    GetCsvReportQuery,
    GetDashboardMetricsQuery,
    GetIncomingReportQuery,
    GetRevenueOverviewQuery,
)
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
from incomings_report.schemas import (
    DashboardMetricsResponse,
    IncomingReportResponse,
    ReportRecordSchema,
    RevenueDataPoint,
    RevenueOverviewResponse,
)

router = APIRouter(prefix="/api/reports", tags=["reports"])

SyncAndGetReportDep = Annotated[SyncAndGetReportUseCase, Depends(get_sync_and_get_report_use_case)]
RevenueOverviewDep = Annotated[GetRevenueOverviewUseCase, Depends(get_revenue_overview_use_case)]
DashboardMetricsDep = Annotated[
    GetDashboardMetricsUseCase, Depends(get_dashboard_metrics_use_case)
]
CsvReportDep = Annotated[GetCsvReportUseCase, Depends(get_csv_report_use_case)]


@router.get("/incoming", response_model=IncomingReportResponse)
async def get_incoming_report(
    use_case: SyncAndGetReportDep,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    start_date: date | None = None,
    end_date: date | None = None,
) -> IncomingReportResponse:
    """
    Sync billing records into ReportsDB and return the full enriched list.

    On every call this endpoint reads all billing records from BillingDB,
    applies the 7.5% tax and 5% commission formula, upserts the results into
    ReportsDB (idempotent via booking_id unique constraint), and returns the
    stored records with aggregated totals.

    Args:
        x_user_id: Injected by API Gateway from the JWT sub claim.
        start_date: Optional ISO date — filter records from this date.
        end_date: Optional ISO date — filter records up to this date.
    """
    if not x_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing X-User-Id header")
    query = GetIncomingReportQuery(start_date=start_date, end_date=end_date)
    result = await use_case.execute(query)

    return IncomingReportResponse(
        records=[
            ReportRecordSchema(
                id=r.id,
                booking_id=r.booking_id,
                payment_reference=r.payment_reference,
                payment_date=r.payment_date,
                gross_value=r.gross_value,
                taxes=r.taxes,
                commission=r.commission,
                net_income=r.net_income,
                status=r.status,
            )
            for r in result.records
        ],
        total_records=result.total_records,
        total_gross=result.total_gross,
        total_net=result.total_net,
    )


@router.get("/revenue-overview", response_model=RevenueOverviewResponse)
async def get_revenue_overview(
    use_case: RevenueOverviewDep,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    months: int = 6,
) -> RevenueOverviewResponse:
    """
    Return monthly aggregated gross revenue for the last N months.

    Results are ordered chronologically and suitable for direct use as a
    bar chart data source. Month labels are short English abbreviations
    ("Jan", "Feb", …).

    Args:
        x_user_id: Injected by API Gateway from the JWT sub claim.
        months: Number of past months to include (default 6).
    """
    if not x_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing X-User-Id header")
    query = GetRevenueOverviewQuery(months=months)
    rows = await use_case.execute(query)
    return RevenueOverviewResponse(
        data=[
            RevenueDataPoint(
                month=row["month"],
                year=row["year"],
                label=row["label"],
                total_revenue=row["total_revenue"],
            )
            for row in rows
        ]
    )


@router.get("/dashboard-metrics", response_model=DashboardMetricsResponse)
async def get_dashboard_metrics(
    use_case: DashboardMetricsDep,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> DashboardMetricsResponse:
    """
    Return executive KPI metrics for the hotel admin dashboard.

    Returns total reservations, current-month revenue, average daily revenue,
    month-over-month trend percentage, and today's check-in/check-out counts.

    Args:
        x_user_id: Injected by API Gateway from the JWT sub claim.
    """
    if not x_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing X-User-Id header")
    query = GetDashboardMetricsQuery()
    metrics = await use_case.execute(query)
    return DashboardMetricsResponse(**metrics)


@router.get("/incoming/csv")
async def get_incoming_csv(
    use_case: CsvReportDep,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    start_date: date | None = None,
    end_date: date | None = None,
) -> StreamingResponse:
    """
    Stream a UTF-8 CSV file (with BOM) with per-booking financial breakdown.

    Columns: Date, Booking Code, Gross Rate, Taxes (7.5%),
    TravelHub Commission (5%), Net Income, Status.

    Args:
        x_user_id: Injected by API Gateway from the JWT sub claim.
        start_date: Optional ISO date — filter records from this date.
        end_date: Optional ISO date — filter records up to this date.
    """
    if not x_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing X-User-Id header")
    query = GetCsvReportQuery(start_date=start_date, end_date=end_date)
    filename = f"revenue_report_{datetime.now().strftime('%Y-%m-%d')}.csv"

    return StreamingResponse(
        use_case.execute(query),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
