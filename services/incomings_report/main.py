"""Entry point for uvicorn — re-exports the app from the incomings_report package."""

from incomings_report.main import app

__all__ = ["app"]
