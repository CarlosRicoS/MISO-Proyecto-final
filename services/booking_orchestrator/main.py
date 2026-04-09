"""Entry point for uvicorn — re-exports the app from the booking_orchestrator package."""

from booking_orchestrator.main import app

__all__ = ["app"]
