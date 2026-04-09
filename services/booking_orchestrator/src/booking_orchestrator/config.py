from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    APP_NAME: str = "Booking Orchestrator"
    DEBUG: bool = False

    # Upstream services — base URLs WITHOUT a trailing slash.
    # In develop these come from SSM params /final-project-miso/{svc}/service_url,
    # injected as env vars by the ecs_service module.
    BOOKING_SERVICE_URL: str = "http://localhost:8001"
    PROPERTIES_SERVICE_URL: str = "http://localhost:8002"

    # Upstream HTTP timeout, in seconds. Kept tight so the saga completes under the 3s SLA.
    UPSTREAM_HTTP_TIMEOUT: float = 2.0

    # AWS / SQS
    AWS_REGION: str = "us-east-1"
    NOTIFICATIONS_QUEUE_URL: str = ""


settings = Settings()
