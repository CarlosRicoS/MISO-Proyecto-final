"""SMTP adapter tests using a stub smtplib.SMTP injected via monkeypatch."""

from unittest.mock import MagicMock

import pytest

from notifications.domain.exceptions import EmailSendError
from notifications.infrastructure import smtp_email_sender as sender_module
from notifications.infrastructure.smtp_email_sender import SmtpEmailSender


def _make_sender() -> SmtpEmailSender:
    return SmtpEmailSender(
        host="smtp.test",
        port=587,
        username="user",
        password="pw",
        use_tls=True,
        from_address="no-reply@test",
    )


def test_sends_message_via_smtp(monkeypatch):
    fake_smtp = MagicMock()
    fake_smtp.__enter__.return_value = fake_smtp
    fake_smtp.__exit__.return_value = False
    monkeypatch.setattr(sender_module.smtplib, "SMTP", lambda *a, **kw: fake_smtp)

    _make_sender().send(to="x@y.z", subject="hi", body="hello")

    fake_smtp.starttls.assert_called_once()
    fake_smtp.login.assert_called_once_with("user", "pw")
    fake_smtp.send_message.assert_called_once()


def test_wraps_smtp_exceptions(monkeypatch):
    import smtplib

    def boom(*args, **kwargs):
        raise smtplib.SMTPException("down")

    monkeypatch.setattr(sender_module.smtplib, "SMTP", boom)

    with pytest.raises(EmailSendError):
        _make_sender().send(to="x@y.z", subject="hi", body="hello")
