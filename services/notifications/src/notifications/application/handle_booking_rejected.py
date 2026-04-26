"""Handler for BOOKING_REJECTED events — notifies the traveler that their booking was rejected."""

import logging

from notifications.application.ports import EmailSender, PushSender
from notifications.domain.events import BookingRejectedEvent

logger = logging.getLogger(__name__)


class HandleBookingRejected:
    def __init__(self, email_sender: EmailSender, push_sender: PushSender) -> None:
        self._email = email_sender
        self._push = push_sender

    def __call__(self, event: BookingRejectedEvent) -> None:
        subject = f"Tu reserva {event.booking_id} fue rechazada"
        body = (
            f"Hola,\n\n"
            f"Lamentamos informarte que tu reserva ha sido rechazada.\n\n"
            f"Reserva: {event.booking_id}\n"
            f"Propiedad: {event.property_id}\n"
            f"Check-in: {event.period_start}\n"
            f"Check-out: {event.period_end}\n"
            f"Motivo del rechazo: {event.rejection_reason}\n\n"
            f"Si tienes preguntas, comunícate con el soporte.\n"
        )
        self._email.send(to=event.user_email, subject=subject, body=body)
        try:
            push_body = f"Tu reserva fue rechazada: {event.rejection_reason}."
            self._push.send(
                user_id=event.user_id,
                title=subject,
                body=push_body,
                notification_type="BOOKING_REJECTED",
                booking_id=event.booking_id,
            )
        except Exception:
            logger.warning("push failed for booking %s", event.booking_id)
