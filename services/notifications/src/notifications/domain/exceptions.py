class NotificationError(Exception):
    """Base class for notification service errors."""


class UnsupportedSchemaError(NotificationError):
    """Raised when a message has an unknown type or schema_version."""


class EmailSendError(NotificationError):
    """Raised when the SMTP send fails."""
