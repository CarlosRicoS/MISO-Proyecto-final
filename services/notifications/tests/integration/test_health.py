import pytest
from httpx import ASGITransport, AsyncClient

from notifications.config import settings
from notifications.main import create_app


@pytest.fixture(autouse=True)
def _disable_consumer(monkeypatch):
    # Prevent the lifespan from trying to start a real SQS consumer during tests.
    monkeypatch.setattr(settings, "CONSUMER_ENABLED", False)
    monkeypatch.setattr(settings, "NOTIFICATIONS_QUEUE_URL", "")


async def test_health():
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}
