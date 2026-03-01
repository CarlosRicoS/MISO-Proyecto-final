import pytest
import httpx
from httpx import AsyncClient, Response
from main import app
from unittest.mock import patch, AsyncMock

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
        "end_date": "2026-03-05"
    }
    
    # Mock httpx.AsyncClient.post and asyncio.sleep to avoid waiting
    mock_response = {"status": "locked", "property_id": payload["property_id"]}
    
    with patch("main.httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post, \
         patch("main.asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
        
        mock_post.return_value = Response(200, json=mock_response)
        
        async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/api/pms/lock-property", json=payload)
        
        # Verify forwarding
        assert response.status_code == 200
        assert response.json() == mock_response
        assert mock_post.called
        
        # Check that it called the correct payload
        args, kwargs = mock_post.call_args
        assert kwargs["json"]["property_id"] == payload["property_id"]
