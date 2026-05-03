from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import incomings_report.infrastructure.billing_models  # noqa: F401 — registers BillingBase models
import incomings_report.infrastructure.models  # noqa: F401 — registers ReportsBase models
from incomings_report.config import settings
from incomings_report.controllers import router as reports_router
from incomings_report.database import ReportsBase, billing_engine, reports_engine


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    # Create ReportsDB tables (own schema — safe to manage)
    async with reports_engine.begin() as conn:
        await conn.run_sync(ReportsBase.metadata.create_all)
    yield
    await reports_engine.dispose()
    await billing_engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Content-Disposition"],
    )

    app.include_router(reports_router)

    @app.get("/api/health")
    async def health_check() -> dict[str, str]:
        return {"status": "healthy"}

    return app


app = create_app()
