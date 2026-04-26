"""FCM push notification adapter using the firebase-admin SDK."""

import json
import logging

import firebase_admin
from firebase_admin import credentials, messaging

from notifications.infrastructure.ssm_token_registry import SsmTokenRegistry

logger = logging.getLogger(__name__)

_APP_NAME = "travelhub-notifications"


class FcmPushSender:
    """Sends FCM push notifications via the firebase-admin SDK."""

    def __init__(
        self,
        *,
        credentials_json: str,
        project_id: str,
        token_registry: SsmTokenRegistry,
    ) -> None:
        # initialize_app raises ValueError if the named app already exists — guard for re-use
        try:
            self._app = firebase_admin.get_app(name=_APP_NAME)
        except ValueError:
            cred = credentials.Certificate(json.loads(credentials_json))
            self._app = firebase_admin.initialize_app(
                cred, {"projectId": project_id}, name=_APP_NAME
            )
        self._registry = token_registry

    def send(
        self,
        *,
        user_id: str,
        title: str,
        body: str,
        notification_type: str,
        booking_id: str,
    ) -> None:
        tokens = self._registry.get_tokens(user_id)
        if not tokens:
            logger.debug("no fcm tokens registered for user_id=%s, skipping push", user_id)
            return
        for token in tokens:
            msg = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data={"bookingId": booking_id, "type": notification_type},
                android=messaging.AndroidConfig(priority="high"),
                token=token,
            )
            messaging.send(msg, app=self._app)
            logger.info(
                "fcm push sent type=%s token=...%s for user_id=%s",
                notification_type, token[-6:], user_id,
            )
