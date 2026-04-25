"""Unit tests for SsmTokenRegistry — all SSM I/O is replaced with mock objects."""

import json
from unittest.mock import MagicMock

from notifications.infrastructure.ssm_token_registry import SsmTokenRegistry


def _make_ssm(value: dict | None = None, *, raise_exc: Exception | None = None) -> MagicMock:
    """Return a mock SSM client that returns `value` or raises `raise_exc`."""
    mock_ssm = MagicMock()

    # Give the mock a concrete ParameterNotFound exception class so that
    # ``except self._ssm.exceptions.ParameterNotFound`` works correctly.
    class _ParameterNotFound(Exception):
        pass

    mock_ssm.exceptions.ParameterNotFound = _ParameterNotFound

    if raise_exc is not None:
        mock_ssm.get_parameter.side_effect = raise_exc
    else:
        payload = json.dumps(value or {})
        mock_ssm.get_parameter.return_value = {"Parameter": {"Value": payload}}

    return mock_ssm


class TestSsmTokenRegistryGetTokens:
    def test_returns_tokens_for_known_user(self):
        mock_ssm = _make_ssm({"u1": ["tok-a", "tok-b"]})
        registry = SsmTokenRegistry(ssm_client=mock_ssm, parameter_path="/test/path")

        tokens = registry.get_tokens("u1")

        assert tokens == ["tok-a", "tok-b"]

    def test_returns_empty_for_unknown_user(self):
        mock_ssm = _make_ssm({"other-user": ["tok-x"]})
        registry = SsmTokenRegistry(ssm_client=mock_ssm, parameter_path="/test/path")

        tokens = registry.get_tokens("u2")

        assert tokens == []

    def test_returns_empty_on_parameter_not_found(self):
        mock_ssm = _make_ssm()
        # Raise ParameterNotFound (the class attached to the mock's exceptions attribute)
        mock_ssm.get_parameter.side_effect = mock_ssm.exceptions.ParameterNotFound
        registry = SsmTokenRegistry(ssm_client=mock_ssm, parameter_path="/missing/path")

        tokens = registry.get_tokens("u1")

        assert tokens == []

    def test_returns_empty_on_generic_exception(self):
        mock_ssm = _make_ssm(raise_exc=RuntimeError("connection refused"))
        registry = SsmTokenRegistry(ssm_client=mock_ssm, parameter_path="/test/path")

        tokens = registry.get_tokens("u1")

        assert tokens == []

    def test_ssm_called_with_correct_parameter_name(self):
        mock_ssm = _make_ssm({"u1": ["tok-a"]})
        registry = SsmTokenRegistry(
            ssm_client=mock_ssm, parameter_path="/project/notifications/fcm-tokens"
        )

        registry.get_tokens("u1")

        mock_ssm.get_parameter.assert_called_once_with(
            Name="/project/notifications/fcm-tokens"
        )

    def test_returns_multiple_tokens_for_user_with_many_devices(self):
        tokens_data = {"u1": ["tok-1", "tok-2", "tok-3"]}
        mock_ssm = _make_ssm(tokens_data)
        registry = SsmTokenRegistry(ssm_client=mock_ssm, parameter_path="/test/path")

        tokens = registry.get_tokens("u1")

        assert len(tokens) == 3
        assert "tok-1" in tokens
        assert "tok-3" in tokens
