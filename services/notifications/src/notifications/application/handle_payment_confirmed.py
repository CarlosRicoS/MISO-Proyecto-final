"""Handler for PAYMENT_CONFIRMED events — notifies the traveler that payment was successful."""

import logging

from notifications.application.ports import EmailSender, PushSender
from notifications.domain.events import PaymentConfirmedEvent

logger = logging.getLogger(__name__)


class HandlePaymentConfirmed:
    def __init__(self, email_sender: EmailSender, push_sender: PushSender) -> None:
        self._email = email_sender
        self._push = push_sender

    def __call__(self, event: PaymentConfirmedEvent) -> None:
        subject = f"Pago confirmado para tu reserva {event.booking_id}"
        body = (
            f"Hola,\n\n"
            f"Tu pago ha sido procesado exitosamente.\n\n"
            f"Reserva: {event.booking_id}\n"
            f"Propiedad: {event.property_id}\n"
            f"Check-in: {event.period_start}\n"
            f"Check-out: {event.period_end}\n"
            f"Huéspedes: {event.guests}\n"
            f"Total: {event.price}\n"
            f"Referencia de pago: {event.payment_reference}\n\n"
            f"Tu reserva está confirmada. ¡Disfruta tu estadía!\n"
        )
        self._email.send(to=event.user_email, subject=subject, body=body)
        try:
            push_body = f"Pago ref. {event.payment_reference} recibido. ¡Todo listo!"
            self._push.send(user_id=event.user_id, title=subject, body=push_body)
        except Exception:
            logger.warning("push failed for booking %s", event.booking_id)
