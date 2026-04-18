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


class TestChangeBookingDates:
    async def _create_confirmed_booking(self, client: AsyncClient) -> dict:
        user_id = str(uuid4())
        create_resp = await client.post(
            "/api/booking/",
            json={
                "property_id": str(uuid4()),
                "guests": 2,
                "period_start": "2026-06-01",
                "period_end": "2026-06-05",
                "price": 250.00,
                "admin_group_id": str(uuid4()),
            },
            headers={"X-User-Id": user_id},
        )
        assert create_resp.status_code == 201
        booking_id = create_resp.json()["id"]

        # Transition to CONFIRMED via the in-memory repo through the app fixture
        from booking.infrastructure.in_memory_booking_repo import InMemoryBookingRepository
        from uuid import UUID as _UUID

        # Access the repo from the app's dependency overrides
        app = client._transport.app  # type: ignore[attr-defined]
        repo: InMemoryBookingRepository = app.dependency_overrides[
            __import__("booking.bootstrap", fromlist=["get_booking_repository"]).get_booking_repository
        ]()
        stored = await repo.get_by_id(_UUID(booking_id))
        stored.approve()
        stored.confirm(payment_reference="PAY-TEST")
        await repo.save(stored)

        return {"booking_id": booking_id, "user_id": user_id}

    async def test_change_dates_success(self, client: AsyncClient, repo):
        user_id = str(uuid4())
        create_resp = await client.post(
            "/api/booking/",
            json={
                "property_id": str(uuid4()),
                "guests": 2,
                "period_start": "2026-06-01",
                "period_end": "2026-06-05",
                "price": 250.00,
                "admin_group_id": str(uuid4()),
            },
            headers={"X-User-Id": user_id},
        )
        booking_id = create_resp.json()["id"]

        from uuid import UUID as _UUID
        stored = await repo.get_by_id(_UUID(booking_id))
        stored.approve()
        stored.confirm(payment_reference="PAY-TEST")
        await repo.save(stored)

        response = await client.patch(
            f"/api/booking/{booking_id}/dates",
            json={
                "new_period_start": "2026-07-01",
                "new_period_end": "2026-07-06",
                "new_price": "320.00",
            },
            headers={"X-User-Id": user_id},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["period_start"] == "2026-07-01"
        assert data["period_end"] == "2026-07-06"
        assert float(data["price"]) == 320.00
        assert float(data["price_difference"]) == 70.00
        assert data["status"] == "CONFIRMED"

    async def test_change_dates_not_found(self, client: AsyncClient):
        response = await client.patch(
            f"/api/booking/{uuid4()}/dates",
            json={
                "new_period_start": "2026-07-01",
                "new_period_end": "2026-07-05",
                "new_price": "200.00",
            },
            headers={"X-User-Id": str(uuid4())},
        )
        assert response.status_code == 404

    async def test_change_dates_not_confirmed(self, client: AsyncClient):
        user_id = str(uuid4())
        create_resp = await client.post(
            "/api/booking/",
            json={
                "property_id": str(uuid4()),
                "guests": 2,
                "period_start": "2026-06-01",
                "period_end": "2026-06-05",
                "price": 250.00,
                "admin_group_id": str(uuid4()),
            },
            headers={"X-User-Id": user_id},
        )
        booking_id = create_resp.json()["id"]

        response = await client.patch(
            f"/api/booking/{booking_id}/dates",
            json={
                "new_period_start": "2026-07-01",
                "new_period_end": "2026-07-05",
                "new_price": "300.00",
            },
            headers={"X-User-Id": user_id},
        )
        assert response.status_code == 409

    async def test_change_dates_invalid_period(self, client: AsyncClient, repo):
        user_id = str(uuid4())
        create_resp = await client.post(
            "/api/booking/",
            json={
                "property_id": str(uuid4()),
                "guests": 1,
                "period_start": "2026-06-01",
                "period_end": "2026-06-05",
                "price": 150.00,
                "admin_group_id": str(uuid4()),
            },
            headers={"X-User-Id": user_id},
        )
        booking_id = create_resp.json()["id"]

        from uuid import UUID as _UUID
        stored = await repo.get_by_id(_UUID(booking_id))
        stored.approve()
        stored.confirm(payment_reference="PAY-INVALID")
        await repo.save(stored)

        response = await client.patch(
            f"/api/booking/{booking_id}/dates",
            json={
                "new_period_start": "2026-07-05",
                "new_period_end": "2026-07-01",
                "new_price": "150.00",
            },
            headers={"X-User-Id": user_id},
        )
        assert response.status_code == 422

    async def test_change_dates_missing_header(self, client: AsyncClient):
        response = await client.patch(
            f"/api/booking/{uuid4()}/dates",
            json={
                "new_period_start": "2026-07-01",
                "new_period_end": "2026-07-05",
                "new_price": "200.00",
            },
        )
        assert response.status_code == 422


async def _create_booking(client: AsyncClient, **overrides) -> dict:
    payload = {
        "property_id": str(uuid4()),
        "guests": 2,
        "period_start": "2026-06-01",
        "period_end": "2026-06-05",
        "price": 250.00,
        "admin_group_id": str(uuid4()),
        **overrides,
    }
    resp = await client.post(
        "/api/booking/",
        json=payload,
        headers={"X-User-Id": str(uuid4())},
    )
    assert resp.status_code == 201
    return resp.json()


class TestAdminConfirmBooking:
    async def test_confirm_pending_booking_success(self, client: AsyncClient):
        booking = await _create_booking(client)
        booking_id = booking["id"]

        response = await client.post(f"/api/booking/{booking_id}/admin-confirm")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "CONFIRMED"
        assert data["payment_reference"].startswith("ADMIN-")
        assert data["rejection_reason"] is None

    async def test_confirm_nonexistent_booking(self, client: AsyncClient):
        response = await client.post(f"/api/booking/{uuid4()}/admin-confirm")
        assert response.status_code == 404

    async def test_confirm_already_confirmed_booking_returns_409(self, client: AsyncClient, repo):
        booking = await _create_booking(client)
        booking_id = booking["id"]

        from uuid import UUID as _UUID
        stored = await repo.get_by_id(_UUID(booking_id))
        stored.approve()
        stored.confirm(payment_reference="PAY-EXISTING")
        await repo.save(stored)

        response = await client.post(f"/api/booking/{booking_id}/admin-confirm")
        assert response.status_code == 409

    async def test_confirm_rejected_booking_returns_409(self, client: AsyncClient, repo):
        booking = await _create_booking(client)
        booking_id = booking["id"]

        from uuid import UUID as _UUID
        stored = await repo.get_by_id(_UUID(booking_id))
        stored.reject("Already rejected")
        await repo.save(stored)

        response = await client.post(f"/api/booking/{booking_id}/admin-confirm")
        assert response.status_code == 409


class TestAdminRejectBooking:
    async def test_reject_pending_booking_success(self, client: AsyncClient):
        booking = await _create_booking(client)
        booking_id = booking["id"]

        response = await client.post(
            f"/api/booking/{booking_id}/admin-reject",
            json={"reason": "Double booking"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "REJECTED"
        assert data["rejection_reason"] == "Double booking"

    async def test_reject_nonexistent_booking(self, client: AsyncClient):
        response = await client.post(
            f"/api/booking/{uuid4()}/admin-reject",
            json={"reason": "Not found"},
        )
        assert response.status_code == 404

    async def test_reject_confirmed_booking_success(self, client: AsyncClient, repo):
        booking = await _create_booking(client)
        booking_id = booking["id"]

        from uuid import UUID as _UUID
        stored = await repo.get_by_id(_UUID(booking_id))
        stored.approve()
        stored.confirm(payment_reference="PAY-XYZ")
        await repo.save(stored)

        response = await client.post(
            f"/api/booking/{booking_id}/admin-reject",
            json={"reason": "Changed mind"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "REJECTED"
        assert data["rejection_reason"] == "Changed mind"

    async def test_reject_with_empty_reason_returns_422(self, client: AsyncClient):
        booking = await _create_booking(client)
        response = await client.post(
            f"/api/booking/{booking['id']}/admin-reject",
            json={"reason": ""},
        )
        assert response.status_code == 422

    async def test_reject_missing_body_returns_422(self, client: AsyncClient):
        booking = await _create_booking(client)
        response = await client.post(f"/api/booking/{booking['id']}/admin-reject")
        assert response.status_code == 422


class TestAdminApproveBooking:
    async def test_approve_pending_booking_success(self, client: AsyncClient):
        booking = await _create_booking(client)
        booking_id = booking["id"]

        response = await client.post(f"/api/booking/{booking_id}/admin-approve")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "APPROVED"
        assert data["payment_reference"] is None

    async def test_approve_nonexistent_booking(self, client: AsyncClient):
        response = await client.post(f"/api/booking/{uuid4()}/admin-approve")
        assert response.status_code == 404

    async def test_approve_already_approved_booking_returns_409(self, client: AsyncClient, repo):
        booking = await _create_booking(client)
        booking_id = booking["id"]

        from uuid import UUID as _UUID
        stored = await repo.get_by_id(_UUID(booking_id))
        stored.approve()
        await repo.save(stored)

        response = await client.post(f"/api/booking/{booking_id}/admin-approve")
        assert response.status_code == 409


class TestUpdatePaymentState:
    async def test_update_payment_state_success(self, client: AsyncClient, repo):
        booking = await _create_booking(client)
        booking_id = booking["id"]

        from uuid import UUID as _UUID
        stored = await repo.get_by_id(_UUID(booking_id))
        stored.approve()
        await repo.save(stored)

        response = await client.post(
            f"/api/booking/{booking_id}/update-payment-state",
            json={"payment_reference": "STRIPE-xyz789"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "CONFIRMED"
        assert data["payment_reference"] == "STRIPE-xyz789"

    async def test_update_payment_state_not_found(self, client: AsyncClient):
        response = await client.post(
            f"/api/booking/{uuid4()}/update-payment-state",
            json={"payment_reference": "STRIPE-abc"},
        )
        assert response.status_code == 404

    async def test_update_payment_state_pending_confirms_directly(self, client: AsyncClient):
        booking = await _create_booking(client)
        response = await client.post(
            f"/api/booking/{booking['id']}/update-payment-state",
            json={"payment_reference": "STRIPE-abc"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "CONFIRMED"

    async def test_update_payment_state_missing_body_returns_422(self, client: AsyncClient):
        booking = await _create_booking(client)
        response = await client.post(
            f"/api/booking/{booking['id']}/update-payment-state",
        )
        assert response.status_code == 422
