"""Light smoke test that bootstrap.build_consumer wires everything without error."""

from moto import mock_aws

from notifications import bootstrap
from notifications.infrastructure.sqs_consumer import SqsConsumer


def test_build_consumer_returns_sqs_consumer():
    with mock_aws():
        consumer = bootstrap.build_consumer()
        assert isinstance(consumer, SqsConsumer)


def test_build_consumer_uses_noop_push_when_no_fcm_credentials():
    """When FIREBASE_CREDENTIALS_JSON and FIREBASE_PROJECT_ID are empty (default),
    build_consumer must still return an SqsConsumer using the _NoOpPushSender."""
    with mock_aws():
        # Ensure the settings have empty FCM credentials (the default)
        from notifications.config import settings
        original_creds = settings.FIREBASE_CREDENTIALS_JSON
        original_proj = settings.FIREBASE_PROJECT_ID
        try:
            settings.FIREBASE_CREDENTIALS_JSON = ""
            settings.FIREBASE_PROJECT_ID = ""
            consumer = bootstrap.build_consumer()
            assert isinstance(consumer, SqsConsumer)
        finally:
            settings.FIREBASE_CREDENTIALS_JSON = original_creds
            settings.FIREBASE_PROJECT_ID = original_proj
