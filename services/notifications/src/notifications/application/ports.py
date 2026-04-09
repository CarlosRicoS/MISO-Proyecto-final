from typing import Protocol


class EmailSender(Protocol):
    """Port for sending an email via whatever transport (SMTP in production)."""

    def send(self, *, to: str, subject: str, body: str) -> None: ...
