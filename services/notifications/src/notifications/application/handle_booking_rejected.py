"""Handler for BOOKING_REJECTED events — notifies the traveler that their booking was rejected."""

from notifications.application.ports import EmailSender
from notifications.domain.events import BookingRejectedEvent


class HandleBookingRejected:
    def __init__(self, email_sender: EmailSender) -> None:
        self._email = email_sender

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
