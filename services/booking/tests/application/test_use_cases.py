from decimal import Decimal
from uuid import uuid4

import pytest

from booking.application.cancel_booking import CancelBookingUseCase
from booking.application.commands import CancelBookingCommand, CreateBookingCommand
from booking.application.create_booking import CreateBookingUseCase
from booking.application.get_booking import GetBookingUseCase, ListUserBookingsUseCase
from booking.domain.booking import BookingStatus
from booking.domain.exceptions import BookingNotFoundError
from booking.infrastructure.in_memory_booking_repo import InMemoryBookingRepository


class TestCreateBookingUseCase:
    @pytest.fixture
    def repo(self):
        return InMemoryBookingRepository()

    @pytest.fixture
    def use_case(self, repo):
        return CreateBookingUseCase(booking_repository=repo)

    async def test_creates_booking_successfully(self, use_case, repo):
        command = CreateBookingCommand(
            property_id=str(uuid4()),
            user_id=str(uuid4()),
            guests=2,
            period_start="2026-06-01",
            period_end="2026-06-05",
            price=Decimal("250.00"),
            admin_group_id=str(uuid4()),
        )
        result = await use_case.execute(command)
        assert result.status == BookingStatus.PENDING
        assert result.guests == 2
        stored = await repo.get_by_id(result.id)
        assert stored.id == result.id

    async def test_rejects_invalid_period(self, use_case):
        command = CreateBookingCommand(
            property_id=str(uuid4()),
            user_id=str(uuid4()),
            guests=2,
            period_start="2026-06-05",
            period_end="2026-06-01",
            price=Decimal("250.00"),
            admin_group_id=str(uuid4()),
        )
        from booking.domain.exceptions import InvalidBookingPeriodError

        with pytest.raises(InvalidBookingPeriodError):
            await use_case.execute(command)


class TestGetBookingUseCase:
    @pytest.fixture
    def repo(self):
        return InMemoryBookingRepository()

    async def test_get_existing_booking(self, repo):
        create_uc = CreateBookingUseCase(booking_repository=repo)
        command = CreateBookingCommand(
            property_id=str(uuid4()),
            user_id=str(uuid4()),
            guests=1,
            period_start="2026-07-01",
            period_end="2026-07-03",
            price=Decimal("100.00"),
            admin_group_id=str(uuid4()),
        )
        created = await create_uc.execute(command)

        get_uc = GetBookingUseCase(booking_repository=repo)
        result = await get_uc.execute(str(created.id))
        assert result.id == created.id

    async def test_raises_not_found(self, repo):
        get_uc = GetBookingUseCase(booking_repository=repo)
        with pytest.raises(BookingNotFoundError):
            await get_uc.execute(str(uuid4()))


class TestListUserBookingsUseCase:
    async def test_lists_bookings_for_user(self):
        repo = InMemoryBookingRepository()
        create_uc = CreateBookingUseCase(booking_repository=repo)
        user_id = str(uuid4())

        for i in range(3):
            command = CreateBookingCommand(
                property_id=str(uuid4()),
                user_id=user_id,
                guests=1,
                period_start=f"2026-0{i + 1}-01",
                period_end=f"2026-0{i + 1}-05",
                price=Decimal("100.00"),
                admin_group_id=str(uuid4()),
            )
            await create_uc.execute(command)

        list_uc = ListUserBookingsUseCase(booking_repository=repo)
        results = await list_uc.execute(user_id)
        assert len(results) == 3

    async def test_returns_empty_for_unknown_user(self):
        repo = InMemoryBookingRepository()
        list_uc = ListUserBookingsUseCase(booking_repository=repo)
        results = await list_uc.execute(str(uuid4()))
        assert results == []


class TestCancelBookingUseCase:
    async def test_cancels_pending_booking(self):
        repo = InMemoryBookingRepository()
        create_uc = CreateBookingUseCase(booking_repository=repo)
        command = CreateBookingCommand(
            property_id=str(uuid4()),
            user_id=str(uuid4()),
            guests=2,
            period_start="2026-08-01",
            period_end="2026-08-05",
            price=Decimal("200.00"),
            admin_group_id=str(uuid4()),
        )
        created = await create_uc.execute(command)

        cancel_uc = CancelBookingUseCase(booking_repository=repo)
        cancel_cmd = CancelBookingCommand(
            booking_id=str(created.id),
            user_id=str(created.user_id),
        )
        result = await cancel_uc.execute(cancel_cmd)
        assert result.status == BookingStatus.CANCELED
