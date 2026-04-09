"""Stdlib smtplib adapter — targets AWS SES SMTP relay in production.

No dependencies beyond the standard library. SES is a standard SMTP server
once you have credentials, so there's nothing SES-specific in the code.
"""

import smtplib
from email.message import EmailMessage

from notifications.domain.exceptions import EmailSendError


class SmtpEmailSender:
    def __init__(
        self,
        *,
        host: str,
        port: int,
        username: str,
        password: str,
        use_tls: bool,
        from_address: str,
    ) -> None:
        self._host = host
        self._port = port
        self._username = username
        self._password = password
        self._use_tls = use_tls
        self._from = from_address

    def send(self, *, to: str, subject: str, body: str) -> None:
        msg = EmailMessage()
        msg["From"] = self._from
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(body)

        try:
            with smtplib.SMTP(self._host, self._port, timeout=10) as smtp:
                if self._use_tls:
                    smtp.starttls()
                if self._username:
                    smtp.login(self._username, self._password)
                smtp.send_message(msg)
        except (smtplib.SMTPException, OSError) as exc:
            raise EmailSendError(f"smtp send failed: {exc}") from exc
