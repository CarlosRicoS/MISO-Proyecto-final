"""Unit tests for CompleteBookingUseCase."""

from decimal import Decimal
from uuid import uuid4

import pytest

from booking.application.commands import CompleteBookingCommand
from booking.application.complete_booking import CompleteBookingUseCase
from booking.application.create_booking import CreateBookingUseCase
from booking.application.commands import CreateBookingCommand
from booking.domain.booking import BookingStatus
from booking.domain.exceptions import (
    BookingNotFoundError,
    InvalidBookingStatusTransitionError,
)
from booking.infrastructure.in_memory_booking_repo import InMemoryBookingRepository


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


async def _create_confirmed_booking(repo: InMemoryBookingRepository):
    """Helper: creates a booking and transitions it to CONFIRMED."""
    create_uc = CreateBookingUseCase(booking_repository=repo)
    booking = await create_uc.execute(_make_create_command())
    booking.approve()
    booking.confirm(payment_reference="PAY-COMPLETE-TEST")
    await repo.save(booking)
    return booking


class TestCompleteBookingUseCase:
    @pytest.fixture
    def repo(self):
        return InMemoryBookingRepository()

    @pytest.fixture
    def use_case(self, repo):
        return CompleteBookingUseCase(booking_repository=repo)

    async def test_completes_confirmed_booking_successfully(self, repo, use_case):
        """Happy path: CONFIRMED booking → status becomes COMPLETED and is saved."""
        booking = await _create_confirmed_booking(repo)

        result = await use_case.execute(CompleteBookingCommand(booking_id=str(booking.id)))

        assert result.status == BookingStatus.COMPLETED
        # Verify persisted state
        stored = await repo.get_by_id(booking.id)
        assert stored.status == BookingStatus.COMPLETED

    async def test_complete_returns_booking_with_all_fields_intact(self, repo, use_case):
        """Completing a booking preserves all other booking fields."""
        booking = await _create_confirmed_booking(repo)
        original_id = booking.id
        original_user_id = booking.user_id
        original_property_id = booking.property_id

        result = await use_case.execute(CompleteBookingCommand(booking_id=str(booking.id)))

        assert result.id == original_id
        assert result.user_id == original_user_id
        assert result.property_id == original_property_id

    async def test_raises_not_found_for_unknown_booking(self, use_case):
        """Booking not found → raises BookingNotFoundError."""
        with pytest.raises(BookingNotFoundError):
            await use_case.execute(CompleteBookingCommand(booking_id=str(uuid4())))

    async def test_raises_invalid_transition_from_pending(self, repo, use_case):
        """Invalid transition from PENDING → raises InvalidBookingStatusTransitionError."""
        create_uc = CreateBookingUseCase(booking_repository=repo)
        booking = await create_uc.execute(_make_create_command())
        assert booking.status == BookingStatus.PENDING

        with pytest.raises(InvalidBookingStatusTransitionError):
            await use_case.execute(CompleteBookingCommand(booking_id=str(booking.id)))

    async def test_raises_invalid_transition_from_approved(self, repo, use_case):
        """Invalid transition from APPROVED → raises InvalidBookingStatusTransitionError."""
        create_uc = CreateBookingUseCase(booking_repository=repo)
        booking = await create_uc.execute(_make_create_command())
        booking.approve()
        await repo.save(booking)

        with pytest.raises(InvalidBookingStatusTransitionError):
            await use_case.execute(CompleteBookingCommand(booking_id=str(booking.id)))

    async def test_raises_invalid_transition_from_canceled(self, repo, use_case):
        """Invalid transition from CANCELED → raises InvalidBookingStatusTransitionError."""
        create_uc = CreateBookingUseCase(booking_repository=repo)
        booking = await create_uc.execute(_make_create_command())
        booking.cancel()
        await repo.save(booking)

        with pytest.raises(InvalidBookingStatusTransitionError):
            await use_case.execute(CompleteBookingCommand(booking_id=str(booking.id)))

    async def test_raises_invalid_transition_from_completed(self, repo, use_case):
        """Invalid transition from COMPLETED → raises InvalidBookingStatusTransitionError."""
        booking = await _create_confirmed_booking(repo)
        booking.complete()
        await repo.save(booking)
        assert booking.status == BookingStatus.COMPLETED

        with pytest.raises(InvalidBookingStatusTransitionError):
            await use_case.execute(CompleteBookingCommand(booking_id=str(booking.id)))

    async def test_raises_invalid_transition_from_rejected(self, repo, use_case):
        """Invalid transition from REJECTED → raises InvalidBookingStatusTransitionError."""
        create_uc = CreateBookingUseCase(booking_repository=repo)
        booking = await create_uc.execute(_make_create_command())
        booking.reject("Rejected for test")
        await repo.save(booking)

        with pytest.raises(InvalidBookingStatusTransitionError):
            await use_case.execute(CompleteBookingCommand(booking_id=str(booking.id)))
