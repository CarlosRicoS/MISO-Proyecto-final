"""Entry point for uvicorn — re-exports the app from the checkin package."""

from checkin.main import app

__all__ = ["app"]
