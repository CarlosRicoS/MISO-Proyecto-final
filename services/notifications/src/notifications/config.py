from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    APP_NAME: str = "Notifications"
    DEBUG: bool = False

    # AWS / SQS
    AWS_REGION: str = "us-east-1"
    NOTIFICATIONS_QUEUE_URL: str = ""

    # SQS consumer tuning
    SQS_WAIT_TIME_SECONDS: int = 20  # long polling
    SQS_MAX_MESSAGES: int = 10
    CONSUMER_ENABLED: bool = True

    # SMTP (AWS SES SMTP interface in production)
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True
    SMTP_FROM: str = "no-reply@travelhub.local"


settings = Settings()
