"""Shared fixtures for checkin service tests."""

import pytest

from checkin.infrastructure.in_memory_checkin_repo import InMemoryCheckInRepository


@pytest.fixture
def repo():
    """Fresh in-memory repository for each test."""
    return InMemoryCheckInRepository()
