from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from incomings_report.config import settings

# ---------------------------------------------------------------------------
# Reports engine (read-write — own ReportsDB)
# ---------------------------------------------------------------------------

reports_engine = create_async_engine(
    settings.database_url,
    echo=settings.DB_ECHO,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_pre_ping=True,
    pool_timeout=settings.DB_POOL_TIMEOUT,
)

reports_session_factory = async_sessionmaker(
    reports_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class ReportsBase(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Billing engine (read-only — BillingDB)
# ---------------------------------------------------------------------------

billing_engine = create_async_engine(
    settings.billing_database_url,
    echo=settings.DB_ECHO,
    pool_pre_ping=True,
)

billing_session_factory = async_sessionmaker(
    billing_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class BillingBase(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Session generators
# ---------------------------------------------------------------------------


async def get_reports_session() -> AsyncGenerator[AsyncSession]:
    async with reports_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_billing_session() -> AsyncGenerator[AsyncSession]:
    async with billing_session_factory() as session:
        try:
            yield session
        except Exception:
            raise
