"""Application configuration, loaded from environment / .env."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # LLM provider. Any OpenAI-compatible endpoint works: leave base_url empty
    # for OpenAI itself, or point it at Groq / Gemini's compatible endpoints
    # (see .env.example) with the matching key and model name.
    openai_api_key: str = ""
    openai_base_url: str = ""
    llm_model: str = "gpt-4o-mini"

    # Tracing
    langsmith_api_key: str = ""
    langsmith_tracing: bool = False
    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""
    langfuse_host: str = "https://cloud.langfuse.com"

    # Live feed (free, keyless: Open-Meteo + NASA EONET). Opt-in; the default
    # feed stays the deterministic fixtures.
    live_feed_enabled: bool = True
    live_fallback_scenario: str = "storm-north-sea"

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
