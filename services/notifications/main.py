"""Entry point for uvicorn — re-exports the app from the notifications package."""

from notifications.main import app

__all__ = ["app"]
