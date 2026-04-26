"""Handler for BOOKING_CANCELLED events — notifies the traveler their booking was cancelled."""

import logging
from decimal import Decimal, InvalidOperation

from notifications.application.ports import EmailSender, PushSender
from notifications.domain.events import BookingCancelledEvent

logger = logging.getLogger(__name__)


def _has_refund(refund_amount: str) -> bool:
    """Return True when the refund amount represents a positive monetary value."""
    try:
        return Decimal(refund_amount) > 0
    except InvalidOperation:
        return False


class HandleBookingCancelled:
    def __init__(self, email_sender: EmailSender, push_sender: PushSender) -> None:
        self._email = email_sender
        self._push = push_sender

    def __call__(self, event: BookingCancelledEvent) -> None:
        subject = f"Tu reserva {event.booking_id} fue cancelada"

        body = (
            f"Hola,\n\n"
            f"Tu reserva ha sido cancelada.\n\n"
            f"Reserva: {event.booking_id}\n"
            f"Propiedad: {event.property_id}\n"
            f"Check-in: {event.period_start}\n"
            f"Check-out: {event.period_end}\n"
        )

        if _has_refund(event.refund_amount):
            body += (
                f"\nSe te reembolsará ${event.refund_amount}.\n"
            )
            if _has_refund(event.penalty_amount):
                body += (
                    f"Se aplicó una penalización de ${event.penalty_amount} "
                    f"por cancelación tardía.\n"
                )
        else:
            body += "\nNo se realizó ningún cargo, por lo que no hay reembolso.\n"

        self._email.send(to=event.user_email, subject=subject, body=body)
        try:
            push_body = f"Tu reserva fue cancelada. Reembolso: ${event.refund_amount}."
            self._push.send(
                user_id=event.user_id,
                title=subject,
                body=push_body,
                notification_type="BOOKING_CANCELLED",
                booking_id=event.booking_id,
            )
        except Exception:
            logger.warning("push failed for booking %s", event.booking_id)
