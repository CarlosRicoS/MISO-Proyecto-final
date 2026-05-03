from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

from incomings_report.application.commands import GetIncomingReportQuery
from incomings_report.application.ports import ReportRepository
from incomings_report.config import settings
from incomings_report.domain.entities import BillingRecord, ReportRecord


@dataclass
class IncomingReportResult:
    records: list[ReportRecord]
    total_records: int
    total_gross: Decimal
    total_net: Decimal


class SyncAndGetReportUseCase:
    """
    Reads all billing records from BillingDB, computes financial breakdown
    (taxes + commission), upserts enriched records into ReportsDB, and
    returns the full list with aggregates.
    """

    def __init__(self, repo: ReportRepository) -> None:
        self._repo = repo

    async def execute(self, query: GetIncomingReportQuery) -> IncomingReportResult:
        billing_records = await self._repo.get_all_billing(
            start_date=query.start_date,
            end_date=query.end_date,
        )
        report_records = self._compute_financials(billing_records)
        await self._repo.upsert_reports(report_records)
        all_reports = await self._repo.get_all_reports(query.start_date, query.end_date)

        total_gross = sum((r.gross_value for r in all_reports), Decimal("0"))
        total_net = sum((r.net_income for r in all_reports), Decimal("0"))

        return IncomingReportResult(
            records=all_reports,
            total_records=len(all_reports),
            total_gross=total_gross,
            total_net=total_net,
        )

    def _compute_financials(self, billing_records: list[BillingRecord]) -> list[ReportRecord]:
        two_places = Decimal("0.01")
        tax_rate = Decimal(str(settings.TAX_RATE))
        commission_rate = Decimal(str(settings.COMMISSION_RATE))

        result = []
        for b in billing_records:
            if not b.booking_id:
                continue
            gross = (b.value or Decimal("0")).quantize(two_places, rounding=ROUND_HALF_UP)
            taxes = (gross * tax_rate).quantize(two_places, rounding=ROUND_HALF_UP)
            commission = (gross * commission_rate).quantize(two_places, rounding=ROUND_HALF_UP)
            net_income = gross - taxes - commission

            payment_date = b.payment_date.date() if b.payment_date else None
            update_date = b.update_date.date() if b.update_date else None

            result.append(
                ReportRecord(
                    booking_id=b.booking_id,
                    payment_reference=b.payment_reference,
                    payment_date=payment_date,
                    update_date=update_date,
                    admin_group_id=b.admin_group_id,
                    gross_value=gross,
                    taxes=taxes,
                    commission=commission,
                    net_income=net_income,
                    status=b.state,
                )
            )
        return result
