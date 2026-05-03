# Incomings Report Service

Generates financial reports for hotel managers. Reads billing records directly from BillingDB, persists enriched records (with 7.5% tax and 5% TravelHub commission applied) into its own ReportsDB, and exposes four endpoints: a per-booking detail list, a monthly revenue aggregation for chart rendering, executive KPI metrics for the dashboard, and a CSV download.

## Stack

- Python 3.13 / FastAPI
- Async SQLAlchemy (asyncpg driver) — two PostgreSQL connections (ReportsDB read-write, BillingDB read-only)
- Hexagonal (ports & adapters) architecture
- `uv` for dependency management

## Architecture

```
controllers.py          — FastAPI HTTP adapter (4 routes)
bootstrap.py            — Dependency-injection factories
schemas.py              — Pydantic request/response models
config.py               — Settings (env vars + defaults, TAX_RATE, COMMISSION_RATE)
database.py             — Two engines: reports_engine (read-write) + billing_engine (read-only)

domain/
  entities.py           — ReportRecord, BillingRecord (frozen dataclasses)
  exceptions.py         — DomainError base

application/
  commands.py                — Query dataclasses for each use case
  ports.py                   — ReportRepository (Protocol)
  sync_and_get_report.py     — SyncAndGetReportUseCase: billing -> upsert -> return
  get_revenue_overview.py    — GetRevenueOverviewUseCase: monthly GROUP BY
  get_dashboard_metrics.py   — GetDashboardMetricsUseCase: KPI aggregation
  get_csv_report.py          — GetCsvReportUseCase: async CSV generator

infrastructure/
  models.py                  — ReportModel (ReportsBase, create_all on startup)
  billing_models.py          — BillingModel (BillingBase, read-only — no create_all)
  sqlalchemy_report_repo.py  — SqlAlchemyReportRepository (real DB adapter)
  in_memory_report_repo.py   — InMemoryReportRepository (injected by tests)
```

Tables are created via `ReportsBase.metadata.create_all` on startup. BillingDB is never modified.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/reports/incoming` | JWT (`X-User-Id`) | Sync billing to ReportsDB, return all records with tax/commission breakdown. Query params: `start_date`, `end_date` (ISO date). |
| `GET` | `/api/reports/revenue-overview` | JWT (`X-User-Id`) | Monthly aggregated gross revenue. Query param: `months` (default 6). |
| `GET` | `/api/reports/dashboard-metrics` | JWT (`X-User-Id`) | Executive KPIs: total reservations, monthly revenue, avg daily revenue, trend %, today check-ins/check-outs. |
| `GET` | `/api/reports/incoming/csv` | JWT (`X-User-Id`) | Stream UTF-8 BOM CSV with per-booking financial breakdown. Query params: `start_date`, `end_date`. |

All endpoints return `401` if the `X-User-Id` header is absent.

## Environment Variables

| Variable | Source | Description |
|---|---|---|
| `DB_USERNAME` | SSM `/final-project-miso/incomings-report/db_username` | ReportsDB PostgreSQL username |
| `DB_PASSWORD` | SSM `/final-project-miso/incomings-report/db_password` | ReportsDB PostgreSQL password |
| `DB_HOST` | SSM `/final-project-miso/incomings-report/db_host` | ReportsDB PostgreSQL host |
| `DB_PORT` | env / default `5432` | ReportsDB PostgreSQL port |
| `DB_NAME` | SSM `/final-project-miso/incomings-report/db_name` | ReportsDB database name |
| `BILLING_DB_USERNAME` | SSM `/final-project-miso/billing/db_username` | BillingDB PostgreSQL username (read-only) |
| `BILLING_DB_PASSWORD` | SSM `/final-project-miso/billing/db_password` | BillingDB PostgreSQL password (read-only) |
| `BILLING_DB_HOST` | SSM `/final-project-miso/billing/db_host` | BillingDB PostgreSQL host (read-only) |
| `BILLING_DB_PORT` | env / default `5432` | BillingDB PostgreSQL port |
| `BILLING_DB_NAME` | SSM `/final-project-miso/billing/db_name` | BillingDB database name (read-only) |
| `TAX_RATE` | env / default `0.075` | Tax rate applied to gross billing value (7.5%) |
| `COMMISSION_RATE` | env / default `0.05` | TravelHub commission rate (5%) |

## Running locally

```bash
cd services/incomings_report
uv sync --group dev          # Install dependencies including dev
uv run pytest tests/ -v      # Run all tests
uv run uvicorn main:app --reload --port 80  # Run locally (requires PostgreSQL)
```

Requires running PostgreSQL instances for both ReportsDB and BillingDB. Copy `.env.example` to `.env` and fill in the connection values.
