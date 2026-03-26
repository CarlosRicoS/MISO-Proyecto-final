import pytest
import httpx
from httpx import AsyncClient, Response
from main import app, _to_dd_mm_yyyy
from unittest.mock import patch, AsyncMock, MagicMock
from datetime import date


@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "pms"}


@pytest.mark.asyncio
async def test_lock_property_forward():
    payload = {
        "property_id": "362e0de1-a2cd-4664-8633-3a283aea776a",
        "start_date": "2026-03-01",
        "end_date": "2026-03-05",
    }

    mock_response = Response(200, content=b'{"status":"locked"}')
    mock_client_instance = AsyncMock()
    mock_client_instance.post.return_value = mock_response
    mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
    mock_client_instance.__aexit__ = AsyncMock(return_value=False)

    with patch("main.httpx.AsyncClient", return_value=mock_client_instance), \
         patch("main.asyncio.sleep", new_callable=AsyncMock):

        async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/api/pms/lock-property", json=payload)

        assert response.status_code == 200
        assert mock_client_instance.post.called

        args, kwargs = mock_client_instance.post.call_args
        assert kwargs["json"]["propertyDetailId"] == payload["property_id"]
        assert kwargs["json"]["startDate"] == "01/03/2026"
        assert kwargs["json"]["endDate"] == "05/03/2026"


@pytest.mark.asyncio
async def test_lock_property_204_returns_locked():
    payload = {
        "property_id": "prop-001",
        "start_date": "2026-06-01",
        "end_date": "2026-06-10",
    }

    mock_response = Response(204)
    mock_client_instance = AsyncMock()
    mock_client_instance.post.return_value = mock_response
    mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
    mock_client_instance.__aexit__ = AsyncMock(return_value=False)

    with patch("main.httpx.AsyncClient", return_value=mock_client_instance), \
         patch("main.asyncio.sleep", new_callable=AsyncMock):

        async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/api/pms/lock-property", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "locked"
        assert data["message"] == "Property locked successfully"


@pytest.mark.asyncio
async def test_lock_property_upstream_400_error():
    payload = {
        "property_id": "prop-001",
        "start_date": "2026-06-01",
        "end_date": "2026-06-10",
    }

    mock_response = Response(400, text="Bad request from properties")
    mock_client_instance = AsyncMock()
    mock_client_instance.post.return_value = mock_response
    mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
    mock_client_instance.__aexit__ = AsyncMock(return_value=False)

    with patch("main.httpx.AsyncClient", return_value=mock_client_instance), \
         patch("main.asyncio.sleep", new_callable=AsyncMock):

        async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/api/pms/lock-property", json=payload)

        assert response.status_code == 400


@pytest.mark.asyncio
async def test_lock_property_upstream_500_error():
    payload = {
        "property_id": "prop-001",
        "start_date": "2026-06-01",
        "end_date": "2026-06-10",
    }

    mock_response = Response(500, text="")
    mock_client_instance = AsyncMock()
    mock_client_instance.post.return_value = mock_response
    mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
    mock_client_instance.__aexit__ = AsyncMock(return_value=False)

    with patch("main.httpx.AsyncClient", return_value=mock_client_instance), \
         patch("main.asyncio.sleep", new_callable=AsyncMock):

        async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/api/pms/lock-property", json=payload)

        assert response.status_code == 500


@pytest.mark.asyncio
async def test_lock_property_connection_error():
    payload = {
        "property_id": "prop-001",
        "start_date": "2026-06-01",
        "end_date": "2026-06-10",
    }

    mock_client_instance = AsyncMock()
    mock_client_instance.post.side_effect = httpx.RequestError("Connection refused")
    mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
    mock_client_instance.__aexit__ = AsyncMock(return_value=False)

    with patch("main.httpx.AsyncClient", return_value=mock_client_instance), \
         patch("main.asyncio.sleep", new_callable=AsyncMock):

        async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/api/pms/lock-property", json=payload)

        assert response.status_code == 503
        assert "Error connecting to Properties service" in response.json()["detail"]


@pytest.mark.asyncio
async def test_lock_property_empty_response_body():
    payload = {
        "property_id": "prop-001",
        "start_date": "2026-06-01",
        "end_date": "2026-06-10",
    }

    mock_response = Response(200, content=b"")
    mock_client_instance = AsyncMock()
    mock_client_instance.post.return_value = mock_response
    mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
    mock_client_instance.__aexit__ = AsyncMock(return_value=False)

    with patch("main.httpx.AsyncClient", return_value=mock_client_instance), \
         patch("main.asyncio.sleep", new_callable=AsyncMock):

        async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/api/pms/lock-property", json=payload)

        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


def test_to_dd_mm_yyyy():
    assert _to_dd_mm_yyyy(date(2026, 3, 1)) == "01/03/2026"
    assert _to_dd_mm_yyyy(date(2026, 12, 25)) == "25/12/2026"


@pytest.mark.asyncio
async def test_lock_property_invalid_payload():
    async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/pms/lock-property", json={"bad": "data"})
    assert response.status_code == 422
