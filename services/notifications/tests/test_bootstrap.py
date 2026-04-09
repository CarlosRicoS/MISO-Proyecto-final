"""Light smoke test that bootstrap.build_consumer wires everything without error."""

from moto import mock_aws

from notifications import bootstrap
from notifications.infrastructure.sqs_consumer import SqsConsumer


def test_build_consumer_returns_sqs_consumer():
    with mock_aws():
        consumer = bootstrap.build_consumer()
        assert isinstance(consumer, SqsConsumer)
