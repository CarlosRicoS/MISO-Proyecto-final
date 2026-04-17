"""Wires up the consumer + dispatcher + email sender singletons."""

import boto3

from notifications.application.handle_booking_confirmed import HandleBookingConfirmed
from notifications.application.handle_booking_created import HandleBookingCreated
from notifications.application.handle_booking_dates_changed import HandleBookingDatesChanged
from notifications.application.handle_booking_rejected import HandleBookingRejected
from notifications.application.handle_payment_confirmed import HandlePaymentConfirmed
from notifications.config import settings
from notifications.infrastructure.dispatcher import MessageDispatcher
from notifications.infrastructure.smtp_email_sender import SmtpEmailSender
from notifications.infrastructure.sqs_consumer import SqsConsumer


def build_consumer() -> SqsConsumer:
    email_sender = SmtpEmailSender(
        host=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=settings.SMTP_USERNAME,
        password=settings.SMTP_PASSWORD,
        use_tls=settings.SMTP_USE_TLS,
        from_address=settings.SMTP_FROM,
    )
    dispatcher = MessageDispatcher(
        booking_created_handler=HandleBookingCreated(email_sender),
        booking_dates_changed_handler=HandleBookingDatesChanged(email_sender),
        booking_confirmed_handler=HandleBookingConfirmed(email_sender),
        booking_rejected_handler=HandleBookingRejected(email_sender),
        payment_confirmed_handler=HandlePaymentConfirmed(email_sender),
    )
    sqs_client = boto3.client("sqs", region_name=settings.AWS_REGION)
    return SqsConsumer(
        sqs_client=sqs_client,
        queue_url=settings.NOTIFICATIONS_QUEUE_URL,
        dispatcher=dispatcher,
        wait_time_seconds=settings.SQS_WAIT_TIME_SECONDS,
        max_messages=settings.SQS_MAX_MESSAGES,
    )
