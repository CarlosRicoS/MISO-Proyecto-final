"""
Controller (HTTP adapter) tests using FastAPI TestClient.

Covers:
  - AC-1: GET /incoming returns list with correct fields
  - AC-3: GET /revenue-overview returns monthly aggregation array
  - AC-4: GET /dashboard-metrics returns KPI object with all required fields
  - AC-5: GET /incoming/csv streams UTF-8 BOM CSV
  - AC-6: All endpoints return 401 when X-User-Id header is missing
"""

from datetime import date
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from incomings_report.infrastructure.in_memory_report_repo import InMemoryReportRepository
from tests.conftest import (
    CURRENT_MONTH,
    CURRENT_YEAR,
    make_client,
    make_billing_record,
    make_report_record,
)

HEADERS = {"X-User-Id": "user-hotel-admin-001"}


# ---------------------------------------------------------------------------
# AC-6: Missing X-User-Id header → 401
# ---------------------------------------------------------------------------


class TestMissingHeader:

    def test_incoming_report_without_header_returns_401(self, empty_client: TestClient):
        response = empty_client.get("/api/reports/incoming")
        assert response.status_code == 401

    def test_revenue_overview_without_header_returns_401(self, empty_client: TestClient):
        response = empty_client.get("/api/reports/revenue-overview")
        assert response.status_code == 401

    def test_dashboard_metrics_without_header_returns_401(self, empty_client: TestClient):
        response = empty_client.get("/api/reports/dashboard-metrics")
        assert response.status_code == 401

    def test_incoming_csv_without_header_returns_401(self, empty_client: TestClient):
        response = empty_client.get("/api/reports/incoming/csv")
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# AC-1: GET /incoming — response shape & field presence
# ---------------------------------------------------------------------------


class TestIncomingReportEndpoint:

    def test_returns_200_with_x_user_id_header(self, client: TestClient):
        response = client.get("/api/reports/incoming", headers=HEADERS)
        assert response.status_code == 200

    def test_response_contains_records_key(self, client: TestClient):
        response = client.get("/api/reports/incoming", headers=HEADERS)
        data = response.json()
        assert "records" in data

    def test_response_contains_total_records_key(self, client: TestClient):
        response = client.get("/api/reports/incoming", headers=HEADERS)
        data = response.json()
        assert "total_records" in data

    def test_response_contains_total_gross_key(self, client: TestClient):
        response = client.get("/api/reports/incoming", headers=HEADERS)
        data = response.json()
        assert "total_gross" in data

    def test_response_contains_total_net_key(self, client: TestClient):
        response = client.get("/api/reports/incoming", headers=HEADERS)
        data = response.json()
        assert "total_net" in data

    def test_records_contain_required_fields(self, client: TestClient):
        """AC-1: each record must have all required fields."""
        response = client.get("/api/reports/incoming", headers=HEADERS)
        data = response.json()
        required_fields = {
            "id", "booking_id", "payment_reference", "payment_date",
            "gross_value", "taxes", "commission", "net_income", "status",
        }
        for record in data["records"]:
            for field in required_fields:
                assert field in record, f"Missing field '{field}' in record"

    def test_total_records_matches_records_list_length(self, client: TestClient):
        response = client.get("/api/reports/incoming", headers=HEADERS)
        data = response.json()
        assert data["total_records"] == len(data["records"])

    def test_seeded_reports_are_returned(self, client: TestClient):
        """The fixture has 3 report records — all should appear."""
        response = client.get("/api/reports/incoming", headers=HEADERS)
        data = response.json()
        assert data["total_records"] == 3

    def test_empty_repo_returns_empty_records_list(self, empty_client: TestClient):
        response = empty_client.get("/api/reports/incoming", headers=HEADERS)
        data = response.json()
        assert data["records"] == []
        assert data["total_records"] == 0

    def test_incoming_report_with_billing_syncs_and_returns_records(self):
        """Syncing from raw billing records returns the correct count."""
        billing = [
            make_billing_record(booking_id="b1", value=Decimal("1000.00")),
            make_billing_record(booking_id="b2", value=Decimal("2000.00")),
        ]
        repo = InMemoryReportRepository(billing_records=billing)
        cl = make_client(repo)
        response = cl.get("/api/reports/incoming", headers=HEADERS)
        data = response.json()
        assert response.status_code == 200
        assert data["total_records"] == 2

    def test_tax_formula_applied_to_records(self):
        """AC-2: verify 7.5% tax is applied to gross value returned through controller."""
        billing = [make_billing_record(booking_id="b1", value=Decimal("1000.00"))]
        repo = InMemoryReportRepository(billing_records=billing)
        cl = make_client(repo)
        response = cl.get("/api/reports/incoming", headers=HEADERS)
        data = response.json()
        record = data["records"][0]
        assert float(record["taxes"]) == pytest.approx(75.00)

    def test_commission_formula_applied_to_records(self):
        """AC-2: verify 5% commission is applied."""
        billing = [make_billing_record(booking_id="b1", value=Decimal("1000.00"))]
        repo = InMemoryReportRepository(billing_records=billing)
        cl = make_client(repo)
        response = cl.get("/api/reports/incoming", headers=HEADERS)
        data = response.json()
        record = data["records"][0]
        assert float(record["commission"]) == pytest.approx(50.00)

    def test_net_income_formula_applied_to_records(self):
        """AC-2: net = gross - taxes - commission."""
        billing = [make_billing_record(booking_id="b1", value=Decimal("1000.00"))]
        repo = InMemoryReportRepository(billing_records=billing)
        cl = make_client(repo)
        response = cl.get("/api/reports/incoming", headers=HEADERS)
        data = response.json()
        record = data["records"][0]
        assert float(record["net_income"]) == pytest.approx(875.00)

    def test_start_date_query_param_filters_records(self):
        """Optional start_date param is accepted and passed through."""
        response = (
            make_client(InMemoryReportRepository())
            .get("/api/reports/incoming", headers=HEADERS, params={"start_date": "2025-01-01"})
        )
        assert response.status_code == 200

    def test_end_date_query_param_filters_records(self):
        """Optional end_date param is accepted and passed through."""
        response = (
            make_client(InMemoryReportRepository())
            .get("/api/reports/incoming", headers=HEADERS, params={"end_date": "2025-12-31"})
        )
        assert response.status_code == 200


# ---------------------------------------------------------------------------
# AC-3: GET /revenue-overview — monthly aggregation
# ---------------------------------------------------------------------------


class TestRevenueOverviewEndpoint:

    def test_returns_200_with_header(self, client: TestClient):
        response = client.get("/api/reports/revenue-overview", headers=HEADERS)
        assert response.status_code == 200

    def test_response_contains_data_key(self, client: TestClient):
        response = client.get("/api/reports/revenue-overview", headers=HEADERS)
        data = response.json()
        assert "data" in data

    def test_data_is_a_list(self, client: TestClient):
        response = client.get("/api/reports/revenue-overview", headers=HEADERS)
        data = response.json()
        assert isinstance(data["data"], list)

    def test_each_data_point_has_required_fields(self, client: TestClient):
        """AC-3: each item needs month, year, label, total_revenue."""
        response = client.get("/api/reports/revenue-overview", headers=HEADERS)
        data = response.json()
        for point in data["data"]:
            assert "month" in point
            assert "year" in point
            assert "label" in point
            assert "total_revenue" in point

    def test_months_query_param_is_accepted(self, client: TestClient):
        response = client.get(
            "/api/reports/revenue-overview", headers=HEADERS, params={"months": 3}
        )
        assert response.status_code == 200

    def test_empty_repo_returns_empty_data_list(self, empty_client: TestClient):
        response = empty_client.get("/api/reports/revenue-overview", headers=HEADERS)
        data = response.json()
        assert data["data"] == []

    def test_label_field_is_string(self, client: TestClient):
        response = client.get("/api/reports/revenue-overview", headers=HEADERS)
        data = response.json()
        for point in data["data"]:
            assert isinstance(point["label"], str)

    def test_current_month_data_appears_in_overview(self):
        """A record from current month should produce one aggregated entry."""
        reports = [
            make_report_record(
                booking_id="b1",
                gross_value=Decimal("1000.00"),
                payment_date=date(CURRENT_YEAR, CURRENT_MONTH, 1),
            )
        ]
        repo = InMemoryReportRepository(report_records=reports)
        cl = make_client(repo)
        response = cl.get(
            "/api/reports/revenue-overview", headers=HEADERS, params={"months": 12}
        )
        data = response.json()
        assert len(data["data"]) >= 1
        months = [(p["year"], p["month"]) for p in data["data"]]
        assert (CURRENT_YEAR, CURRENT_MONTH) in months


# ---------------------------------------------------------------------------
# AC-4: GET /dashboard-metrics — KPI object
# ---------------------------------------------------------------------------


class TestDashboardMetricsEndpoint:

    def test_returns_200_with_header(self, client: TestClient):
        response = client.get("/api/reports/dashboard-metrics", headers=HEADERS)
        assert response.status_code == 200

    def test_response_has_total_reservations(self, client: TestClient):
        response = client.get("/api/reports/dashboard-metrics", headers=HEADERS)
        data = response.json()
        assert "total_reservations" in data

    def test_response_has_monthly_revenue(self, client: TestClient):
        response = client.get("/api/reports/dashboard-metrics", headers=HEADERS)
        data = response.json()
        assert "monthly_revenue" in data

    def test_response_has_avg_daily_revenue(self, client: TestClient):
        response = client.get("/api/reports/dashboard-metrics", headers=HEADERS)
        data = response.json()
        assert "avg_daily_revenue" in data

    def test_response_has_revenue_trend_pct(self, client: TestClient):
        response = client.get("/api/reports/dashboard-metrics", headers=HEADERS)
        data = response.json()
        assert "revenue_trend_pct" in data

    def test_response_has_today_checkins(self, client: TestClient):
        response = client.get("/api/reports/dashboard-metrics", headers=HEADERS)
        data = response.json()
        assert "today_checkins" in data

    def test_response_has_today_checkouts(self, client: TestClient):
        response = client.get("/api/reports/dashboard-metrics", headers=HEADERS)
        data = response.json()
        assert "today_checkouts" in data

    def test_total_reservations_is_integer(self, client: TestClient):
        response = client.get("/api/reports/dashboard-metrics", headers=HEADERS)
        data = response.json()
        assert isinstance(data["total_reservations"], int)

    def test_empty_repo_returns_zero_metrics(self, empty_client: TestClient):
        response = empty_client.get("/api/reports/dashboard-metrics", headers=HEADERS)
        data = response.json()
        assert data["total_reservations"] == 0
        assert float(data["monthly_revenue"]) == 0.0

    def test_three_seeded_reports_show_in_total(self, client: TestClient):
        """Fixture has 3 report records — total_reservations must be 3."""
        response = client.get("/api/reports/dashboard-metrics", headers=HEADERS)
        data = response.json()
        assert data["total_reservations"] == 3


# ---------------------------------------------------------------------------
# AC-5: GET /incoming/csv — CSV streaming with BOM
# ---------------------------------------------------------------------------


class TestCsvEndpoint:

    def test_returns_200_with_header(self, client: TestClient):
        response = client.get("/api/reports/incoming/csv", headers=HEADERS)
        assert response.status_code == 200

    def test_content_type_is_text_csv(self, client: TestClient):
        """AC-5: Content-Type must be text/csv."""
        response = client.get("/api/reports/incoming/csv", headers=HEADERS)
        assert "text/csv" in response.headers["content-type"]

    def test_content_disposition_is_attachment(self, client: TestClient):
        """Content-Disposition should indicate a file download."""
        response = client.get("/api/reports/incoming/csv", headers=HEADERS)
        content_disp = response.headers.get("content-disposition", "")
        assert "attachment" in content_disp

    def test_content_disposition_filename_starts_with_revenue_report(self, client: TestClient):
        response = client.get("/api/reports/incoming/csv", headers=HEADERS)
        content_disp = response.headers.get("content-disposition", "")
        assert "revenue_report_" in content_disp

    def test_response_body_starts_with_utf8_bom(self, client: TestClient):
        """AC-5: first 3 bytes of the body must be the UTF-8 BOM."""
        response = client.get("/api/reports/incoming/csv", headers=HEADERS)
        assert response.content[:3] == b"\xef\xbb\xbf"

    def test_csv_contains_header_row(self, client: TestClient):
        response = client.get("/api/reports/incoming/csv", headers=HEADERS)
        text = response.content.decode("utf-8-sig")  # strips BOM
        first_line = text.splitlines()[0]
        assert "Date" in first_line
        assert "Booking Code" in first_line
        assert "Gross Rate" in first_line
        assert "Net Income" in first_line
        assert "Status" in first_line

    def test_csv_has_data_rows_for_seeded_reports(self, client: TestClient):
        """3 seeded reports → 3 data rows (plus 1 header)."""
        response = client.get("/api/reports/incoming/csv", headers=HEADERS)
        text = response.content.decode("utf-8-sig")
        lines = [l for l in text.splitlines() if l]
        # 1 header + 3 data rows
        assert len(lines) == 4

    def test_empty_repo_csv_has_only_header(self, empty_client: TestClient):
        response = empty_client.get("/api/reports/incoming/csv", headers=HEADERS)
        text = response.content.decode("utf-8-sig")
        lines = [l for l in text.splitlines() if l]
        assert len(lines) == 1  # header only

    def test_csv_accepts_start_date_query_param(self, client: TestClient):
        response = client.get(
            "/api/reports/incoming/csv",
            headers=HEADERS,
            params={"start_date": "2025-01-01"},
        )
        assert response.status_code == 200

    def test_csv_accepts_end_date_query_param(self, client: TestClient):
        response = client.get(
            "/api/reports/incoming/csv",
            headers=HEADERS,
            params={"end_date": "2025-12-31"},
        )
        assert response.status_code == 200


# ---------------------------------------------------------------------------
# Health check endpoint
# ---------------------------------------------------------------------------


class TestHealthEndpoint:

    def test_health_check_returns_200(self, client: TestClient):
        response = client.get("/api/health")
        assert response.status_code == 200

    def test_health_check_returns_healthy_status(self, client: TestClient):
        response = client.get("/api/health")
        assert response.json() == {"status": "healthy"}
