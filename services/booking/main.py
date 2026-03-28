"""Entry point for uvicorn — re-exports the app from the booking package."""

from booking.main import app

__all__ = ["app"]
