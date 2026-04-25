"""Reads FCM device tokens from an SSM parameter (JSON dict user_id → [token, ...])."""

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)


class SsmTokenRegistry:
    """Reads FCM device tokens from an SSM parameter (JSON dict user_id → [token, ...])."""

    def __init__(self, *, ssm_client: Any, parameter_path: str) -> None:
        self._ssm = ssm_client
        self._path = parameter_path

    def get_tokens(self, user_id: str) -> list[str]:
        try:
            response = self._ssm.get_parameter(Name=self._path)
            data = json.loads(response["Parameter"]["Value"])
            return data.get(user_id, [])
        except self._ssm.exceptions.ParameterNotFound:
            return []
        except Exception:
            logger.warning("ssm token registry read failed for path %s", self._path)
            return []
