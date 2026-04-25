"""Unit tests for FcmPushSender — firebase_admin is mocked at module level."""

import json
from unittest.mock import MagicMock, patch, call

import pytest


# ---------------------------------------------------------------------------
# Minimal fake credentials JSON that passes json.loads() inside __init__
# (the real firebase_admin.credentials.Certificate is also mocked away)
# ---------------------------------------------------------------------------
_FAKE_CREDS = json.dumps({
    "type": "service_account",
    "project_id": "test-project",
    "private_key_id": "key-id",
    "private_key": "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0Z3VS5\n-----END RSA PRIVATE KEY-----\n",
    "client_email": "test@test-project.iam.gserviceaccount.com",
    "client_id": "123456",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
})
_FAKE_PROJECT = "test-project"


def _make_registry(tokens: list[str]) -> MagicMock:
    """Return a mock SsmTokenRegistry that returns `tokens` for any user."""
    mock_registry = MagicMock()
    mock_registry.get_tokens.return_value = tokens
    return mock_registry


def _build_sender(registry: MagicMock, mock_firebase_admin, mock_messaging):
    """
    Import and instantiate FcmPushSender inside the patch context so that the
    module-level ``firebase_admin`` name is already replaced.

    We simulate the case where the named app does NOT exist yet (get_app raises
    ValueError), so initialize_app is called.
    """
    mock_firebase_admin.get_app.side_effect = ValueError("app not found")
    mock_firebase_admin.initialize_app.return_value = MagicMock(name="mock-app")

    # Import inside the test so the patched module-level names are used
    from notifications.infrastructure.fcm_push_sender import FcmPushSender

    return FcmPushSender(
        credentials_json=_FAKE_CREDS,
        project_id=_FAKE_PROJECT,
        token_registry=registry,
    )


class TestFcmPushSenderSend:
    def test_send_calls_messaging_send_for_each_token(self):
        registry = _make_registry(["token-aaa", "token-bbb"])

        with (
            patch("notifications.infrastructure.fcm_push_sender.firebase_admin") as mock_fa,
            patch("notifications.infrastructure.fcm_push_sender.messaging") as mock_msg,
            patch("notifications.infrastructure.fcm_push_sender.credentials") as mock_creds,
        ):
            mock_fa.get_app.side_effect = ValueError("no app")
            mock_fa.initialize_app.return_value = MagicMock(name="mock-app")

            from notifications.infrastructure.fcm_push_sender import FcmPushSender
            sender = FcmPushSender(
                credentials_json=_FAKE_CREDS,
                project_id=_FAKE_PROJECT,
                token_registry=registry,
            )

            sender.send(user_id="u1", title="Test Title", body="Test Body")

            assert mock_msg.send.call_count == 2

    def test_send_skips_when_no_tokens(self):
        registry = _make_registry([])

        with (
            patch("notifications.infrastructure.fcm_push_sender.firebase_admin") as mock_fa,
            patch("notifications.infrastructure.fcm_push_sender.messaging") as mock_msg,
            patch("notifications.infrastructure.fcm_push_sender.credentials"),
        ):
            mock_fa.get_app.side_effect = ValueError("no app")
            mock_fa.initialize_app.return_value = MagicMock(name="mock-app")

            from notifications.infrastructure.fcm_push_sender import FcmPushSender
            sender = FcmPushSender(
                credentials_json=_FAKE_CREDS,
                project_id=_FAKE_PROJECT,
                token_registry=registry,
            )

            sender.send(user_id="u1", title="Test Title", body="Test Body")

            mock_msg.send.assert_not_called()

    def test_send_logs_debug_when_no_tokens(self, caplog):
        """Silently skipped — no exception raised when token list is empty."""
        import logging
        registry = _make_registry([])

        with (
            patch("notifications.infrastructure.fcm_push_sender.firebase_admin") as mock_fa,
            patch("notifications.infrastructure.fcm_push_sender.messaging"),
            patch("notifications.infrastructure.fcm_push_sender.credentials"),
        ):
            mock_fa.get_app.side_effect = ValueError("no app")
            mock_fa.initialize_app.return_value = MagicMock(name="mock-app")

            from notifications.infrastructure.fcm_push_sender import FcmPushSender
            sender = FcmPushSender(
                credentials_json=_FAKE_CREDS,
                project_id=_FAKE_PROJECT,
                token_registry=registry,
            )

            with caplog.at_level(logging.DEBUG, logger="notifications.infrastructure.fcm_push_sender"):
                # Must not raise any exception
                sender.send(user_id="u1", title="T", body="B")

            assert any("skipping push" in record.message for record in caplog.records)

    def test_init_uses_existing_app_if_already_initialized(self):
        """When get_app succeeds, initialize_app must NOT be called."""
        registry = _make_registry([])
        mock_existing_app = MagicMock(name="existing-app")

        with (
            patch("notifications.infrastructure.fcm_push_sender.firebase_admin") as mock_fa,
            patch("notifications.infrastructure.fcm_push_sender.messaging"),
            patch("notifications.infrastructure.fcm_push_sender.credentials"),
        ):
            # get_app succeeds — app already exists
            mock_fa.get_app.return_value = mock_existing_app
            mock_fa.get_app.side_effect = None  # override any previous side_effect

            from notifications.infrastructure.fcm_push_sender import FcmPushSender
            sender = FcmPushSender(
                credentials_json=_FAKE_CREDS,
                project_id=_FAKE_PROJECT,
                token_registry=registry,
            )

            mock_fa.initialize_app.assert_not_called()
            assert sender._app is mock_existing_app

    def test_send_passes_correct_app_to_messaging(self):
        registry = _make_registry(["single-token"])
        mock_app = MagicMock(name="mock-app")

        with (
            patch("notifications.infrastructure.fcm_push_sender.firebase_admin") as mock_fa,
            patch("notifications.infrastructure.fcm_push_sender.messaging") as mock_msg,
            patch("notifications.infrastructure.fcm_push_sender.credentials"),
        ):
            mock_fa.get_app.side_effect = ValueError("no app")
            mock_fa.initialize_app.return_value = mock_app

            from notifications.infrastructure.fcm_push_sender import FcmPushSender
            sender = FcmPushSender(
                credentials_json=_FAKE_CREDS,
                project_id=_FAKE_PROJECT,
                token_registry=registry,
            )

            sender.send(user_id="u1", title="Title", body="Body")

            # Verify the app passed to messaging.send is the one from initialize_app
            mock_msg.send.assert_called_once()
            _, kwargs = mock_msg.send.call_args
            assert kwargs["app"] is mock_app

    def test_send_queries_registry_with_correct_user_id(self):
        registry = _make_registry([])

        with (
            patch("notifications.infrastructure.fcm_push_sender.firebase_admin") as mock_fa,
            patch("notifications.infrastructure.fcm_push_sender.messaging"),
            patch("notifications.infrastructure.fcm_push_sender.credentials"),
        ):
            mock_fa.get_app.side_effect = ValueError("no app")
            mock_fa.initialize_app.return_value = MagicMock()

            from notifications.infrastructure.fcm_push_sender import FcmPushSender
            sender = FcmPushSender(
                credentials_json=_FAKE_CREDS,
                project_id=_FAKE_PROJECT,
                token_registry=registry,
            )

            sender.send(user_id="user-xyz", title="T", body="B")

            registry.get_tokens.assert_called_once_with("user-xyz")
