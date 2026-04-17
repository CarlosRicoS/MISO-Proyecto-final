"""Handler for BOOKING_CANCELLED events — notifies the traveler their booking was cancelled."""

from notifications.application.ports import EmailSender
from notifications.domain.events import BookingCancelledEvent


class HandleBookingCancelled:
    def __init__(self, email_sender: EmailSender) -> None:
        self._email = email_sender

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
        self._email.send(to=event.user_email, subject=subject, body=body)
