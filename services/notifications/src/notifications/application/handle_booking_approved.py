"""Handler for BOOKING_APPROVED events — notifies the traveler their booking was approved."""

import logging

from notifications.application.ports import EmailSender, PushSender
from notifications.domain.events import BookingApprovedEvent

logger = logging.getLogger(__name__)


class HandleBookingApproved:
    def __init__(self, email_sender: EmailSender, push_sender: PushSender) -> None:
        self._email = email_sender
        self._push = push_sender

    def __call__(self, event: BookingApprovedEvent) -> None:
        subject = f"Tu reserva {event.booking_id} fue aprobada"
        body = (
            f"Hola,\n\n"
            f"Tu reserva ha sido aprobada por el administrador del hotel.\n\n"
            f"Reserva: {event.booking_id}\n"
            f"Propiedad: {event.property_id}\n"
            f"Check-in: {event.period_start}\n"
            f"Check-out: {event.period_end}\n"
            f"Huéspedes: {event.guests}\n"
            f"Total: {event.price}\n\n"
            f"Ya puedes proceder con el pago para confirmar tu reserva.\n"
        )
        self._email.send(to=event.user_email, subject=subject, body=body)
        try:
            push_body = "Ya puedes proceder con el pago para confirmar tu reserva."
            self._push.send(user_id=event.user_id, title=subject, body=push_body)
        except Exception:
            logger.warning("push failed for booking %s", event.booking_id)
