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


class BookingNotFoundError(OrchestratorError):
    """Raised when the booking service returns 404 for a booking lookup."""

    def __init__(self, booking_id: str) -> None:
        super().__init__(f"booking {booking_id} not found")
        self.booking_id = booking_id


class BookingChangeDatesError(OrchestratorError):
    """Raised when the booking service rejects the date-change request."""

    def __init__(self, detail: str, status_code: int) -> None:
        super().__init__(f"booking change_dates failed ({status_code}): {detail}")
        self.detail = detail
        self.status_code = status_code


class BookingConfirmError(OrchestratorError):
    """Raised when the booking service rejects the admin-confirm request."""

    def __init__(self, detail: str, status_code: int) -> None:
        super().__init__(f"booking admin-confirm failed ({status_code}): {detail}")
        self.detail = detail
        self.status_code = status_code


class BookingRejectError(OrchestratorError):
    """Raised when the booking service rejects the admin-reject request."""

    def __init__(self, detail: str, status_code: int) -> None:
        super().__init__(f"booking admin-reject failed ({status_code}): {detail}")
        self.detail = detail
        self.status_code = status_code


class NotificationPublishError(OrchestratorError):
    """Raised when the orchestrator cannot publish to the notifications queue.

    This is logged but not fatal — the booking is still persisted.
    """


class StripePaymentError(OrchestratorError):
    """Raised when a Stripe payment create or confirm operation fails."""

    def __init__(self, detail: str) -> None:
        super().__init__(f"stripe payment failed: {detail}")
        self.detail = detail


class BillingPublishError(OrchestratorError):
    """Raised when publishing to the billing queue fails. Best-effort, not fatal."""


class BookingApproveError(OrchestratorError):
    """Raised when the booking service rejects the admin-approve request."""

    def __init__(self, detail: str, status_code: int) -> None:
        super().__init__(f"booking admin-approve failed ({status_code}): {detail}")
        self.detail = detail
        self.status_code = status_code


class BookingUpdatePaymentError(OrchestratorError):
    """Raised when the booking service rejects the update-payment-state request."""

    def __init__(self, detail: str, status_code: int) -> None:
        super().__init__(f"booking update-payment-state failed ({status_code}): {detail}")
        self.detail = detail
        self.status_code = status_code
