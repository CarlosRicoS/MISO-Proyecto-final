"""Wires up the consumer + dispatcher + email sender + push sender singletons."""

import logging

import boto3

from notifications.application.handle_booking_approved import HandleBookingApproved
from notifications.application.handle_booking_cancelled import HandleBookingCancelled
from notifications.application.handle_booking_confirmed import HandleBookingConfirmed
from notifications.application.handle_booking_created import HandleBookingCreated
from notifications.application.handle_booking_dates_changed import HandleBookingDatesChanged
from notifications.application.handle_booking_rejected import HandleBookingRejected
from notifications.application.handle_payment_confirmed import HandlePaymentConfirmed
from notifications.application.ports import PushSender
from notifications.config import settings
from notifications.infrastructure.dispatcher import MessageDispatcher
from notifications.infrastructure.fcm_push_sender import FcmPushSender
from notifications.infrastructure.smtp_email_sender import SmtpEmailSender
from notifications.infrastructure.sqs_consumer import SqsConsumer
from notifications.infrastructure.ssm_token_registry import SsmTokenRegistry

logger = logging.getLogger(__name__)


class _NoOpPushSender:
    """Fallback push sender used when Firebase credentials are not configured."""

    def send(self, *, user_id: str, title: str, body: str) -> None:
        logger.debug("push notifications disabled (no FCM credentials configured)")


def build_consumer() -> SqsConsumer:
    email_sender = SmtpEmailSender(
        host=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=settings.SMTP_USERNAME,
        password=settings.SMTP_PASSWORD,
        use_tls=settings.SMTP_USE_TLS,
        from_address=settings.SMTP_FROM,
    )

    push_sender: PushSender
    if settings.FIREBASE_CREDENTIALS_JSON and settings.FIREBASE_PROJECT_ID:
        ssm_client = boto3.client("ssm", region_name=settings.AWS_REGION)
        token_registry = SsmTokenRegistry(
            ssm_client=ssm_client,
            parameter_path=settings.FCM_TOKENS_SSM_PATH,
        )
        push_sender = FcmPushSender(
            credentials_json=settings.FIREBASE_CREDENTIALS_JSON,
            project_id=settings.FIREBASE_PROJECT_ID,
            token_registry=token_registry,
        )
    else:
        push_sender = _NoOpPushSender()

    dispatcher = MessageDispatcher(
        booking_created_handler=HandleBookingCreated(email_sender, push_sender),
        booking_approved_handler=HandleBookingApproved(email_sender, push_sender),
        booking_cancelled_handler=HandleBookingCancelled(email_sender, push_sender),
        booking_dates_changed_handler=HandleBookingDatesChanged(email_sender, push_sender),
        booking_confirmed_handler=HandleBookingConfirmed(email_sender, push_sender),
        booking_rejected_handler=HandleBookingRejected(email_sender, push_sender),
        payment_confirmed_handler=HandlePaymentConfirmed(email_sender, push_sender),
    )
    sqs_client = boto3.client("sqs", region_name=settings.AWS_REGION)
    return SqsConsumer(
        sqs_client=sqs_client,
        queue_url=settings.NOTIFICATIONS_QUEUE_URL,
        dispatcher=dispatcher,
        wait_time_seconds=settings.SQS_WAIT_TIME_SECONDS,
        max_messages=settings.SQS_MAX_MESSAGES,
    )
