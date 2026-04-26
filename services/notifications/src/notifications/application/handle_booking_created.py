"""Handler for BOOKING_CREATED events — builds the email body and delegates to SMTP."""

import logging

from notifications.application.ports import EmailSender, PushSender
from notifications.domain.events import BookingCreatedEvent

logger = logging.getLogger(__name__)


class HandleBookingCreated:
    def __init__(self, email_sender: EmailSender, push_sender: PushSender) -> None:
        self._email = email_sender
        self._push = push_sender

    def __call__(self, event: BookingCreatedEvent) -> None:
        subject = f"Tu reserva {event.booking_id} fue creada"
        body = (
            f"Hola,\n\n"
            f"Recibimos tu solicitud de reserva.\n\n"
            f"Reserva: {event.booking_id}\n"
            f"Propiedad: {event.property_id}\n"
            f"Check-in: {event.period_start}\n"
            f"Check-out: {event.period_end}\n"
            f"Huéspedes: {event.guests}\n"
            f"Total: {event.price}\n"
            f"Estado: {event.status}\n\n"
            f"Te avisaremos cuando tu pago sea procesado.\n"
        )
        self._email.send(to=event.user_email, subject=subject, body=body)
        try:
            push_body = f"Recibimos tu solicitud para la propiedad {event.property_id}."
            self._push.send(
                user_id=event.user_id,
                title=subject,
                body=push_body,
                notification_type="BOOKING_CREATED",
                booking_id=event.booking_id,
            )
        except Exception:
            logger.warning("push failed for booking %s", event.booking_id)
