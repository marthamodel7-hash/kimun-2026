from pydantic_settings import BaseSettings, SettingsConfigDict
import os


def _resolve_db_url() -> str:
    # Isolate from other projects' DATABASE_URL in shared dev machines.
    # Use Postgres only when explicitly opted in; else local SQLite.
    if os.getenv("KIMUN_ALLOW_POSTGRES") == "1" and os.getenv("DATABASE_URL"):
        return os.getenv("DATABASE_URL", "")
    return os.getenv("KIMUN_DATABASE_URL", "sqlite:///./kimun.db")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")
    DATABASE_URL: str = _resolve_db_url()
    JWT_SECRET: str = "change-me-in-production-min-32-chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    # AI provider: "gemini" (Google) or "nvidia" (NVIDIA Integrate). Server-side only.
    AI_PROVIDER: str = "gemini"
    # Google Gemini (server-side only; never in the browser)
    GEMINI_API_KEY: str = ""
    GEMINI_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta"
    GEMINI_MODEL: str = "gemini-3.6-flash"
    # NVIDIA (kept as an alternative provider)
    NVIDIA_API_KEY: str = ""
    NVIDIA_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    DEFAULT_AI_MODEL: str = "nvidia/llama-3.1-nemotron-70b-instruct"
    AI_TIMEOUT_SECONDS: int = 30
    AI_MAX_TOKENS: int = 1024
    CONFERENCE_NAME: str = "KIMUN 2026"
    CONFERENCE_VENUE: str = "Karachi"
    CONFERENCE_DATE: str = "2026-12-18"
    # SMTP email (falls back to console log when SMTP_HOST is empty)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    SMTP_FROM: str = "noreply@kimun.org"
    # Registration fees (placeholder — configurable via .env)
    REGISTRATION_FEE_INDIVIDUAL: int = 8000
    REGISTRATION_FEE_DELEGATION: int = 45000


settings = Settings()
# Isolate from unrelated DATABASE_URL on shared dev machines (e.g. other projects).
# Postgres is used only with explicit opt-in; default is local SQLite file.
if os.getenv("KIMUN_ALLOW_POSTGRES") != "1":
    settings.DATABASE_URL = os.getenv("KIMUN_DATABASE_URL", "sqlite:///./kimun.db")
