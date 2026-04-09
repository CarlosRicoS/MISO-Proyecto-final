class OrchestratorError(Exception):
    """Base class for orchestrator-level errors."""


class BookingCreateError(OrchestratorError):
    """Raised when the booking service rejects the create request."""

    def __init__(self, detail: str) -> None:
        super().__init__(f"booking create failed: {detail}")
        self.detail = detail


class PropertyLockError(OrchestratorError):
    """Raised when poc_properties cannot lock the property for the requested period."""

    def __init__(self, detail: str) -> None:
        super().__init__(f"property lock failed: {detail}")
        self.detail = detail


class ReservationFailedError(OrchestratorError):
    """Raised when the saga could not complete — compensation has already been attempted."""

    def __init__(self, reason: str) -> None:
        super().__init__(f"reservation failed: {reason}")
        self.reason = reason


class NotificationPublishError(OrchestratorError):
    """Raised when the orchestrator cannot publish to the notifications queue.

    This is logged but not fatal — the booking is still persisted.
    """
