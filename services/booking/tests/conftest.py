import ast
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from booking.bootstrap import get_booking_repository
from booking.infrastructure.in_memory_booking_repo import InMemoryBookingRepository
from booking.main import create_app


@pytest.fixture
def repo():
    return InMemoryBookingRepository()


@pytest.fixture
def app(repo):
    application = create_app()
    application.dependency_overrides[get_booking_repository] = lambda: repo
    return application


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestArchitectureRules:
    """Verify hexagonal architecture import rules are not violated."""

    @staticmethod
    def _get_imports(filepath: Path) -> list[str]:
        tree = ast.parse(filepath.read_text())
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and node.module:
                imports.append(node.module)
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
        return imports

    def test_domain_has_no_infrastructure_imports(self):
        """Domain layer must not import from infrastructure."""
        for filepath in Path("src/booking/domain").rglob("*.py"):
            imports = self._get_imports(filepath)
            for imp in imports:
                assert "infrastructure" not in imp, (
                    f"ARCHITECTURE VIOLATION: {filepath} imports from infrastructure: {imp}"
                )
                assert "sqlalchemy" not in imp, (
                    f"ARCHITECTURE VIOLATION: {filepath} imports SQLAlchemy: {imp}"
                )
                assert "fastapi" not in imp, (
                    f"ARCHITECTURE VIOLATION: {filepath} imports FastAPI: {imp}"
                )

    def test_domain_has_no_application_imports(self):
        """Domain layer must not import from application."""
        for filepath in Path("src/booking/domain").rglob("*.py"):
            imports = self._get_imports(filepath)
            for imp in imports:
                assert "application" not in imp, (
                    f"ARCHITECTURE VIOLATION: {filepath} imports from application: {imp}"
                )

    def test_application_has_no_infrastructure_imports(self):
        """Application layer must not import from infrastructure."""
        for filepath in Path("src/booking/application").rglob("*.py"):
            imports = self._get_imports(filepath)
            for imp in imports:
                assert "infrastructure" not in imp, (
                    f"ARCHITECTURE VIOLATION: {filepath} imports from infrastructure: {imp}"
                )
