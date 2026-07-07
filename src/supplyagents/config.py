"""Application configuration, loaded from environment / .env."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Provider
    openai_api_key: str = ""

    # Tracing
    langsmith_api_key: str = ""
    langsmith_tracing: bool = False
    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""

    # External data (blank -> mock providers)
    weather_api_key: str = ""
    news_api_key: str = ""

    # State
    checkpoint_db: str = "orchestrator.sqlite"

    # The cost-override threshold above which a human must approve.
    human_approval_threshold: float = 0.15

    # App
    log_level: str = "INFO"
    environment: str = "local"


def get_settings() -> Settings:
    """Return application settings. A function so tests can override it cleanly."""
    return Settings()
