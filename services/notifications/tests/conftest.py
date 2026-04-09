import ast
from pathlib import Path


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


class TestArchitectureRules:
    def test_domain_has_no_infrastructure_imports(self):
        for filepath in Path("src/notifications/domain").rglob("*.py"):
            imports = _get_imports(filepath)
            for imp in imports:
                assert "infrastructure" not in imp
                assert "boto3" not in imp
                assert "smtplib" not in imp
                assert "fastapi" not in imp

    def test_application_has_no_infrastructure_imports(self):
        for filepath in Path("src/notifications/application").rglob("*.py"):
            imports = _get_imports(filepath)
            for imp in imports:
                assert "infrastructure" not in imp
                assert "boto3" not in imp
                assert "smtplib" not in imp
