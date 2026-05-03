"""Unit tests for CheckAvailabilityUseCase."""

from uuid import UUID, uuid4

import pytest

from checkin.application.check_availability import CheckAvailabilityUseCase
from checkin.application.commands import CheckAvailabilityQuery, RegisterPropertyCommand
from checkin.application.register_property import RegisterPropertyUseCase
from checkin.infrastructure.in_memory_checkin_repo import InMemoryCheckInRepository


class TestCheckAvailabilityUseCase:
    @pytest.fixture
    def use_case(self, repo: InMemoryCheckInRepository) -> CheckAvailabilityUseCase:
        return CheckAvailabilityUseCase(checkin_repository=repo)

    async def test_returns_not_available_for_unregistered_property(
        self, use_case: CheckAvailabilityUseCase
    ):
        """Property not registered → is_available is False."""
        property_id = str(uuid4())
        result = await use_case.execute(CheckAvailabilityQuery(property_id=property_id))

        assert result["is_available"] is False
        assert result["property_id"] == property_id

    async def test_returns_available_for_registered_property(
        self, repo: InMemoryCheckInRepository, use_case: CheckAvailabilityUseCase
    ):
        """Property registered → is_available is True and property_id matches."""
        property_id = str(uuid4())
        # Register the property first
        register_uc = RegisterPropertyUseCase(checkin_repository=repo)
        await register_uc.execute(RegisterPropertyCommand(property_id=property_id))

        result = await use_case.execute(CheckAvailabilityQuery(property_id=property_id))

        assert result["is_available"] is True
        assert result["property_id"] == property_id

    async def test_different_property_ids_are_independent(
        self, repo: InMemoryCheckInRepository, use_case: CheckAvailabilityUseCase
    ):
        """Registering one property does not affect availability of another."""
        prop_registered = str(uuid4())
        prop_not_registered = str(uuid4())

        register_uc = RegisterPropertyUseCase(checkin_repository=repo)
        await register_uc.execute(RegisterPropertyCommand(property_id=prop_registered))

        result_registered = await use_case.execute(
            CheckAvailabilityQuery(property_id=prop_registered)
        )
        result_not_registered = await use_case.execute(
            CheckAvailabilityQuery(property_id=prop_not_registered)
        )

        assert result_registered["is_available"] is True
        assert result_not_registered["is_available"] is False
