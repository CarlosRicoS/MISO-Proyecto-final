"""Handler for BOOKING_DATES_CHANGED events — notifies the traveler of the updated dates."""

from decimal import Decimal

from notifications.application.ports import EmailSender
from notifications.domain.events import BookingDatesChangedEvent


class HandleBookingDatesChanged:
    def __init__(self, email_sender: EmailSender) -> None:
        self._email = email_sender

    def __call__(self, event: BookingDatesChangedEvent) -> None:
        diff = Decimal(event.price_difference)
        diff_str = f"+{diff:.2f}" if diff >= 0 else f"{diff:.2f}"

        subject = f"Tu reserva {event.booking_id} fue modificada"
        body = (
            f"Hola,\n\n"
            f"Las fechas de tu reserva han sido actualizadas.\n\n"
            f"Reserva: {event.booking_id}\n"
            f"Propiedad: {event.property_id}\n"
            f"Fechas anteriores: {event.old_period_start} → {event.old_period_end}\n"
            f"Nuevas fechas: {event.new_period_start} → {event.new_period_end}\n"
            f"Nuevo total: {event.new_price}\n"
            f"Diferencia de precio: {diff_str}\n"
        )
        self._email.send(to=event.user_email, subject=subject, body=body)
