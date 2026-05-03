"""Unit tests for RegisterPropertyUseCase."""

from uuid import UUID, uuid4

import pytest

from checkin.application.commands import RegisterPropertyCommand
from checkin.application.register_property import RegisterPropertyUseCase
from checkin.domain.exceptions import PropertyAlreadyRegisteredError
from checkin.domain.value_objects import CheckingAvailable
from checkin.infrastructure.in_memory_checkin_repo import InMemoryCheckInRepository


class TestRegisterPropertyUseCase:
    @pytest.fixture
    def use_case(self, repo: InMemoryCheckInRepository) -> RegisterPropertyUseCase:
        return RegisterPropertyUseCase(checkin_repository=repo)

    async def test_happy_path_returns_checking_available_with_qr_token(
        self, use_case: RegisterPropertyUseCase
    ):
        """Happy path: valid property_id → returns CheckingAvailable with non-empty qr_token."""
        property_id = str(uuid4())
        command = RegisterPropertyCommand(property_id=property_id)

        result = await use_case.execute(command)

        assert isinstance(result, CheckingAvailable)
        assert str(result.property_id) == property_id
        assert result.qr_token  # non-empty
        assert isinstance(result.id, UUID)

    async def test_qr_token_is_unique_per_registration(
        self, repo: InMemoryCheckInRepository
    ):
        """Each registration generates a distinct qr_token (uuid4-based)."""
        prop1 = str(uuid4())
        prop2 = str(uuid4())
        uc = RegisterPropertyUseCase(checkin_repository=repo)

        result1 = await uc.execute(RegisterPropertyCommand(property_id=prop1))
        result2 = await uc.execute(RegisterPropertyCommand(property_id=prop2))

        assert result1.qr_token != result2.qr_token

    async def test_duplicate_property_raises_already_registered_error(
        self, use_case: RegisterPropertyUseCase
    ):
        """Registering the same property_id a second time raises PropertyAlreadyRegisteredError."""
        property_id = str(uuid4())
        command = RegisterPropertyCommand(property_id=property_id)

        await use_case.execute(command)  # first registration succeeds

        with pytest.raises(PropertyAlreadyRegisteredError) as exc_info:
            await use_case.execute(command)  # second call must raise

        assert str(exc_info.value.property_id) == property_id

    async def test_stored_record_is_retrievable_by_property(
        self, repo: InMemoryCheckInRepository, use_case: RegisterPropertyUseCase
    ):
        """After registration, repo.get_available_by_property returns the stored record."""
        property_id = str(uuid4())
        result = await use_case.execute(RegisterPropertyCommand(property_id=property_id))

        stored = await repo.get_available_by_property(UUID(property_id))
        assert stored is not None
        assert stored.qr_token == result.qr_token
        assert stored.id == result.id

    async def test_stored_record_is_retrievable_by_token(
        self, repo: InMemoryCheckInRepository, use_case: RegisterPropertyUseCase
    ):
        """After registration, repo.get_available_by_token finds the record by its token."""
        property_id = str(uuid4())
        result = await use_case.execute(RegisterPropertyCommand(property_id=property_id))

        stored = await repo.get_available_by_token(result.qr_token)
        assert stored is not None
        assert str(stored.property_id) == property_id
