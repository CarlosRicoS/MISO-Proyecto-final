from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    APP_NAME: str = "IncomingsReport"
    DEBUG: bool = False

    # ReportsDB (own database)
    DB_USERNAME: str = "postgres"
    DB_PASSWORD: str = "postgres"
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "incomings_report"
    DB_ECHO: bool = False
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_RECYCLE: int = 3600
    DB_POOL_TIMEOUT: int = 30

    # BillingDB (read-only)
    BILLING_DB_USERNAME: str = "postgres"
    BILLING_DB_PASSWORD: str = "postgres"
    BILLING_DB_HOST: str = "localhost"
    BILLING_DB_PORT: int = 5432
    BILLING_DB_NAME: str = "billing"

    # Financial constants
    TAX_RATE: float = 0.075
    COMMISSION_RATE: float = 0.05

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.DB_USERNAME}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    @property
    def billing_database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.BILLING_DB_USERNAME}:{self.BILLING_DB_PASSWORD}"
            f"@{self.BILLING_DB_HOST}:{self.BILLING_DB_PORT}/{self.BILLING_DB_NAME}"
        )


settings = Settings()
