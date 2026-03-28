from uuid import uuid4

from httpx import AsyncClient


class TestHealthCheck:
    async def test_health(self, client: AsyncClient):
        response = await client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}


class TestCreateBooking:
    async def test_create_booking_success(self, client: AsyncClient):
        user_id = str(uuid4())
        payload = {
            "property_id": str(uuid4()),
            "guests": 2,
            "period_start": "2026-06-01",
            "period_end": "2026-06-05",
            "price": 250.00,
            "admin_group_id": str(uuid4()),
        }
        response = await client.post(
            "/api/booking/",
            json=payload,
            headers={"X-User-Id": user_id},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "PENDING"
        assert data["guests"] == 2
        assert data["user_id"] == user_id

    async def test_create_booking_invalid_period(self, client: AsyncClient):
        payload = {
            "property_id": str(uuid4()),
            "guests": 2,
            "period_start": "2026-06-05",
            "period_end": "2026-06-01",
            "price": 250.00,
            "admin_group_id": str(uuid4()),
        }
        response = await client.post(
            "/api/booking/",
            json=payload,
            headers={"X-User-Id": str(uuid4())},
        )
        assert response.status_code == 422

    async def test_create_booking_missing_user_header(self, client: AsyncClient):
        payload = {
            "property_id": str(uuid4()),
            "guests": 2,
            "period_start": "2026-06-01",
            "period_end": "2026-06-05",
            "price": 250.00,
            "admin_group_id": str(uuid4()),
        }
        response = await client.post("/api/booking/", json=payload)
        assert response.status_code == 422


class TestGetBooking:
    async def test_get_existing_booking(self, client: AsyncClient):
        user_id = str(uuid4())
        create_resp = await client.post(
            "/api/booking/",
            json={
                "property_id": str(uuid4()),
                "guests": 1,
                "period_start": "2026-07-01",
                "period_end": "2026-07-03",
                "price": 100.00,
                "admin_group_id": str(uuid4()),
            },
            headers={"X-User-Id": user_id},
        )
        booking_id = create_resp.json()["id"]

        response = await client.get(f"/api/booking/{booking_id}")
        assert response.status_code == 200
        assert response.json()["id"] == booking_id

    async def test_get_nonexistent_booking(self, client: AsyncClient):
        response = await client.get(f"/api/booking/{uuid4()}")
        assert response.status_code == 404


class TestListUserBookings:
    async def test_list_bookings(self, client: AsyncClient):
        user_id = str(uuid4())
        for _ in range(2):
            await client.post(
                "/api/booking/",
                json={
                    "property_id": str(uuid4()),
                    "guests": 1,
                    "period_start": "2026-08-01",
                    "period_end": "2026-08-03",
                    "price": 80.00,
                    "admin_group_id": str(uuid4()),
                },
                headers={"X-User-Id": user_id},
            )

        response = await client.get(
            "/api/booking/",
            headers={"X-User-Id": user_id},
        )
        assert response.status_code == 200
        assert len(response.json()) == 2


class TestCancelBooking:
    async def test_cancel_booking_success(self, client: AsyncClient):
        user_id = str(uuid4())
        create_resp = await client.post(
            "/api/booking/",
            json={
                "property_id": str(uuid4()),
                "guests": 2,
                "period_start": "2026-09-01",
                "period_end": "2026-09-05",
                "price": 300.00,
                "admin_group_id": str(uuid4()),
            },
            headers={"X-User-Id": user_id},
        )
        booking_id = create_resp.json()["id"]

        response = await client.post(
            f"/api/booking/{booking_id}/cancel",
            headers={"X-User-Id": user_id},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "CANCELED"

    async def test_cancel_nonexistent_booking(self, client: AsyncClient):
        response = await client.post(
            f"/api/booking/{uuid4()}/cancel",
            headers={"X-User-Id": str(uuid4())},
        )
        assert response.status_code == 404
