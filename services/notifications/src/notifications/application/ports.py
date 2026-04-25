from typing import Protocol


class EmailSender(Protocol):
    """Port for sending an email via whatever transport (SMTP in production)."""

    def send(self, *, to: str, subject: str, body: str) -> None: ...


class PushSender(Protocol):
    """Port for sending a push notification to a user's registered devices."""

    def send(self, *, user_id: str, title: str, body: str) -> None: ...
