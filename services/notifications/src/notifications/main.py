"""FastAPI app with a lifespan-managed background SQS consumer task."""

import asyncio
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from notifications.bootstrap import build_consumer
from notifications.config import settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    consumer_task: asyncio.Task | None = None
    if settings.CONSUMER_ENABLED and settings.NOTIFICATIONS_QUEUE_URL:
        consumer = build_consumer()
        consumer_task = asyncio.create_task(consumer.run())
        logger.info("sqs consumer task started")
    else:
        logger.warning("sqs consumer disabled (no queue url or CONSUMER_ENABLED=false)")
    try:
        yield
    finally:
        if consumer_task is not None:
            consumer_task.cancel()
            try:
                await consumer_task
            except asyncio.CancelledError:
                pass


def create_app() -> FastAPI:
    app = FastAPI(title=settings.APP_NAME, version="0.1.0", lifespan=lifespan)

    @app.get("/api/health")
    async def health_check() -> dict[str, str]:
        return {"status": "healthy"}

    return app


app = create_app()
