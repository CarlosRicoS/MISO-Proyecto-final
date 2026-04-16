"""Handler for BOOKING_CONFIRMED events — notifies the traveler that their booking is confirmed."""

from notifications.application.ports import EmailSender
from notifications.domain.events import BookingConfirmedEvent


class HandleBookingConfirmed:
    def __init__(self, email_sender: EmailSender) -> None:
        self._email = email_sender

    def __call__(self, event: BookingConfirmedEvent) -> None:
        subject = f"Tu reserva {event.booking_id} fue confirmada"
        body = (
            f"Hola,\n\n"
            f"Tu reserva ha sido confirmada por el administrador del hotel.\n\n"
            f"Reserva: {event.booking_id}\n"
            f"Propiedad: {event.property_id}\n"
            f"Check-in: {event.period_start}\n"
            f"Check-out: {event.period_end}\n"
            f"Huéspedes: {event.guests}\n"
            f"Total: {event.price}\n"
            f"Referencia de pago: {event.payment_reference}\n\n"
            f"¡Disfruta tu estadía!\n"
        )
        self._email.send(to=event.user_email, subject=subject, body=body)
