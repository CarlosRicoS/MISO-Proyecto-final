from decimal import Decimal
from uuid import uuid4

import pytest

from booking.application.admin_approve_booking import AdminApproveBookingUseCase
from booking.application.admin_confirm_booking import AdminConfirmBookingUseCase
from booking.application.admin_reject_booking import AdminRejectBookingUseCase
from booking.application.cancel_booking import CancelBookingUseCase
from booking.application.change_dates import ChangeDatesUseCase
from booking.application.commands import (
    AdminApproveBookingCommand,
    AdminConfirmBookingCommand,
    AdminRejectBookingCommand,
    CancelBookingCommand,
    ChangeDatesCommand,
    CreateBookingCommand,
    UpdatePaymentStateCommand,
)
from booking.application.create_booking import CreateBookingUseCase
from booking.application.get_booking import GetBookingUseCase, ListUserBookingsUseCase
from booking.application.update_payment_state import UpdatePaymentStateUseCase
from booking.domain.booking import BookingStatus
from booking.domain.exceptions import (
    BookingDateChangeNotAllowedError,
    BookingNotFoundError,
    BookingValidationError,
    InvalidBookingStatusTransitionError,
)
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


class TestChangeDatesUseCase:
    async def _create_confirmed_booking(self, repo: InMemoryBookingRepository):
        create_uc = CreateBookingUseCase(booking_repository=repo)
        command = CreateBookingCommand(
            property_id=str(uuid4()),
            user_id=str(uuid4()),
            guests=2,
            period_start="2026-06-01",
            period_end="2026-06-05",
            price=Decimal("250.00"),
            admin_group_id=str(uuid4()),
        )
        booking = await create_uc.execute(command)
        booking.approve()
        booking.confirm(payment_reference="PAY-001")
        await repo.save(booking)
        return booking

    async def test_change_dates_confirmed_booking_success(self):
        repo = InMemoryBookingRepository()
        original = await self._create_confirmed_booking(repo)

        uc = ChangeDatesUseCase(booking_repository=repo)
        cmd = ChangeDatesCommand(
            booking_id=str(original.id),
            user_id=str(original.user_id),
            new_period_start="2026-07-01",
            new_period_end="2026-07-06",
            new_price=Decimal("320.00"),
        )
        updated, diff = await uc.execute(cmd)

        assert updated.status == BookingStatus.CONFIRMED
        assert str(updated.period.start_date) == "2026-07-01"
        assert str(updated.period.end_date) == "2026-07-06"
        assert updated.price.amount == Decimal("320.00")
        assert diff == Decimal("70.00")

    async def test_change_dates_non_confirmed_booking_raises(self):
        repo = InMemoryBookingRepository()
        create_uc = CreateBookingUseCase(booking_repository=repo)
        booking = await create_uc.execute(
            CreateBookingCommand(
                property_id=str(uuid4()),
                user_id=str(uuid4()),
                guests=1,
                period_start="2026-06-01",
                period_end="2026-06-03",
                price=Decimal("100.00"),
                admin_group_id=str(uuid4()),
            )
        )

        uc = ChangeDatesUseCase(booking_repository=repo)
        cmd = ChangeDatesCommand(
            booking_id=str(booking.id),
            user_id=str(booking.user_id),
            new_period_start="2026-07-01",
            new_period_end="2026-07-05",
            new_price=Decimal("150.00"),
        )
        with pytest.raises(BookingDateChangeNotAllowedError):
            await uc.execute(cmd)

    async def test_change_dates_booking_not_found_raises(self):
        repo = InMemoryBookingRepository()
        uc = ChangeDatesUseCase(booking_repository=repo)
        cmd = ChangeDatesCommand(
            booking_id=str(uuid4()),
            user_id=str(uuid4()),
            new_period_start="2026-07-01",
            new_period_end="2026-07-05",
            new_price=Decimal("150.00"),
        )
        with pytest.raises(BookingNotFoundError):
            await uc.execute(cmd)


def _make_create_command(**overrides) -> CreateBookingCommand:
    defaults = dict(
        property_id=str(uuid4()),
        user_id=str(uuid4()),
        guests=2,
        period_start="2026-06-01",
        period_end="2026-06-05",
        price=Decimal("250.00"),
        admin_group_id=str(uuid4()),
    )
    defaults.update(overrides)
    return CreateBookingCommand(**defaults)


class TestAdminConfirmBookingUseCase:
    async def test_confirms_pending_booking(self):
        repo = InMemoryBookingRepository()
        create_uc = CreateBookingUseCase(booking_repository=repo)
        booking = await create_uc.execute(_make_create_command())

        uc = AdminConfirmBookingUseCase(booking_repository=repo)
        result = await uc.execute(AdminConfirmBookingCommand(booking_id=str(booking.id)))

        assert result.status == BookingStatus.CONFIRMED
        assert result.payment_reference is not None
        assert result.payment_reference.startswith("ADMIN-")

    async def test_raises_not_found(self):
        repo = InMemoryBookingRepository()
        uc = AdminConfirmBookingUseCase(booking_repository=repo)
        with pytest.raises(BookingNotFoundError):
            await uc.execute(AdminConfirmBookingCommand(booking_id=str(uuid4())))

    async def test_raises_on_already_confirmed(self):
        repo = InMemoryBookingRepository()
        create_uc = CreateBookingUseCase(booking_repository=repo)
        booking = await create_uc.execute(_make_create_command())
        booking.approve()
        booking.confirm("PAY-PREV")
        await repo.save(booking)

        uc = AdminConfirmBookingUseCase(booking_repository=repo)
        with pytest.raises(InvalidBookingStatusTransitionError):
            await uc.execute(AdminConfirmBookingCommand(booking_id=str(booking.id)))


class TestAdminRejectBookingUseCase:
    async def test_rejects_pending_booking(self):
        repo = InMemoryBookingRepository()
        create_uc = CreateBookingUseCase(booking_repository=repo)
        booking = await create_uc.execute(_make_create_command())

        uc = AdminRejectBookingUseCase(booking_repository=repo)
        result = await uc.execute(
            AdminRejectBookingCommand(booking_id=str(booking.id), reason="Not available")
        )

        assert result.status == BookingStatus.REJECTED
        assert result.rejection_reason == "Not available"

    async def test_raises_not_found(self):
        repo = InMemoryBookingRepository()
        uc = AdminRejectBookingUseCase(booking_repository=repo)
        with pytest.raises(BookingNotFoundError):
            await uc.execute(
                AdminRejectBookingCommand(booking_id=str(uuid4()), reason="reason")
            )

    async def test_raises_on_non_pending_booking(self):
        repo = InMemoryBookingRepository()
        create_uc = CreateBookingUseCase(booking_repository=repo)
        booking = await create_uc.execute(_make_create_command())
        booking.approve()
        await repo.save(booking)

        uc = AdminRejectBookingUseCase(booking_repository=repo)
        with pytest.raises(InvalidBookingStatusTransitionError):
            await uc.execute(
                AdminRejectBookingCommand(booking_id=str(booking.id), reason="Too late")
            )

    async def test_raises_on_empty_reason(self):
        repo = InMemoryBookingRepository()
        create_uc = CreateBookingUseCase(booking_repository=repo)
        booking = await create_uc.execute(_make_create_command())

        uc = AdminRejectBookingUseCase(booking_repository=repo)
        with pytest.raises(BookingValidationError):
            await uc.execute(
                AdminRejectBookingCommand(booking_id=str(booking.id), reason="")
            )


class TestAdminApproveBookingUseCase:
    async def test_approves_pending_booking(self):
        repo = InMemoryBookingRepository()
        create_uc = CreateBookingUseCase(booking_repository=repo)
        booking = await create_uc.execute(_make_create_command())

        uc = AdminApproveBookingUseCase(booking_repository=repo)
        result = await uc.execute(AdminApproveBookingCommand(booking_id=str(booking.id)))

        assert result.status == BookingStatus.APPROVED
        assert result.payment_reference is None

    async def test_raises_not_found(self):
        repo = InMemoryBookingRepository()
        uc = AdminApproveBookingUseCase(booking_repository=repo)
        with pytest.raises(BookingNotFoundError):
            await uc.execute(AdminApproveBookingCommand(booking_id=str(uuid4())))

    async def test_raises_on_non_pending_booking(self):
        repo = InMemoryBookingRepository()
        create_uc = CreateBookingUseCase(booking_repository=repo)
        booking = await create_uc.execute(_make_create_command())
        booking.approve()
        await repo.save(booking)

        uc = AdminApproveBookingUseCase(booking_repository=repo)
        with pytest.raises(InvalidBookingStatusTransitionError):
            await uc.execute(AdminApproveBookingCommand(booking_id=str(booking.id)))


class TestUpdatePaymentStateUseCase:
    async def test_confirms_approved_booking_with_payment_reference(self):
        repo = InMemoryBookingRepository()
        create_uc = CreateBookingUseCase(booking_repository=repo)
        booking = await create_uc.execute(_make_create_command())
        booking.approve()
        await repo.save(booking)

        uc = UpdatePaymentStateUseCase(booking_repository=repo)
        result = await uc.execute(
            UpdatePaymentStateCommand(
                booking_id=str(booking.id),
                payment_reference="STRIPE-abc123",
            )
        )

        assert result.status == BookingStatus.CONFIRMED
        assert result.payment_reference == "STRIPE-abc123"

    async def test_raises_not_found(self):
        repo = InMemoryBookingRepository()
        uc = UpdatePaymentStateUseCase(booking_repository=repo)
        with pytest.raises(BookingNotFoundError):
            await uc.execute(
                UpdatePaymentStateCommand(
                    booking_id=str(uuid4()),
                    payment_reference="STRIPE-abc123",
                )
            )

    async def test_raises_on_non_approved_booking(self):
        repo = InMemoryBookingRepository()
        create_uc = CreateBookingUseCase(booking_repository=repo)
        booking = await create_uc.execute(_make_create_command())

        uc = UpdatePaymentStateUseCase(booking_repository=repo)
        with pytest.raises(InvalidBookingStatusTransitionError):
            await uc.execute(
                UpdatePaymentStateCommand(
                    booking_id=str(booking.id),
                    payment_reference="STRIPE-abc123",
                )
            )
