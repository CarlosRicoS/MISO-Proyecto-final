import ast
from pathlib import Path

import pytest


@pytest.fixture
def sample_command():
    from decimal import Decimal

    from booking_orchestrator.application.commands import CreateReservationCommand

    return CreateReservationCommand(
        property_id="prop-123",
        user_id="550e8400-e29b-41d4-a716-446655440000",
        user_email="traveler@example.com",
        guests=2,
        period_start="2026-06-01",
        period_end="2026-06-05",
        price=Decimal("250.00"),
        admin_group_id="770e8400-e29b-41d4-a716-446655440000",
    )


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
        for filepath in Path("src/booking_orchestrator/domain").rglob("*.py"):
            imports = self._get_imports(filepath)
            for imp in imports:
                assert "infrastructure" not in imp
                assert "httpx" not in imp
                assert "boto3" not in imp
                assert "fastapi" not in imp

    def test_domain_has_no_application_imports(self):
        for filepath in Path("src/booking_orchestrator/domain").rglob("*.py"):
            imports = self._get_imports(filepath)
            for imp in imports:
                assert "application" not in imp

    def test_application_has_no_infrastructure_imports(self):
        for filepath in Path("src/booking_orchestrator/application").rglob("*.py"):
            imports = self._get_imports(filepath)
            for imp in imports:
                assert "infrastructure" not in imp
                assert "httpx" not in imp
                assert "boto3" not in imp
                assert "fastapi" not in imp
