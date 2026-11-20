from typing import List, Union
from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Flenzr Core API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/flenzr"
    # Fallback/test SQLite URL
    TEST_DATABASE_URL: str = "sqlite+aiosqlite:///:memory:"

    # Supabase Configuration
    SUPABASE_URL: str = "https://example.supabase.co"
    SUPABASE_ANON_KEY: str = "mock-anon-key"
    SUPABASE_SERVICE_ROLE_KEY: str = "mock-service-role-key"
    SUPABASE_JWT_SECRET: str = "super-secret-supabase-jwt-key-for-local-development"
    SUPABASE_JWT_ALGORITHM: str = "HS256"
    SUPABASE_JWT_AUDIENCE: str = "authenticated"
    SUPABASE_JWKS_URL: Union[str, None] = None

    # Private collaboration deliverables; keep within the project's global upload limit.
    COLLABORATION_STORAGE_BUCKET: str = "collaboration-files"
    COLLABORATION_FILE_MAX_BYTES: int = Field(default=50 * 1024 * 1024, ge=1024, le=500 * 1024 * 1024)

    # Instagram Unified Login / legacy Instagram Login (server-only credentials)
    INSTAGRAM_LOGIN_MODE: str = "unified"
    INSTAGRAM_CONFIG_ID: str = ""
    INSTAGRAM_APP_ID: str = ""
    INSTAGRAM_APP_SECRET: str = ""
    INSTAGRAM_REDIRECT_URI: str = ""
    INSTAGRAM_API_VERSION: str = "v26.0"
    SOCIAL_TOKEN_ENCRYPTION_KEY: str = ""

    # YouTube OAuth (server-only downloaded Web client)
    YOUTUBE_OAUTH_CLIENT_FILE: str = ".secrets/youtube-oauth-client.json"
    YOUTUBE_REDIRECT_URI: str = "http://localhost:3210/api/social/youtube/callback"

    # LinkedIn member connection (OpenID Connect; server-only)
    LINKEDIN_CLIENT_ID: str = ""
    LINKEDIN_CLIENT_SECRET: str = ""
    LINKEDIN_REDIRECT_URI: str = ""

    # X OAuth 2.0 confidential Web client (not the OAuth 1.0 API key/secret)
    X_CLIENT_ID: str = ""
    X_CLIENT_SECRET: str = ""
    X_REDIRECT_URI: str = ""

    # Facebook Pages uses its own User-token configuration; reuse the Meta app
    # credentials above unless an explicit separate pair is supplied.
    FACEBOOK_APP_ID: str = ""
    FACEBOOK_APP_SECRET: str = ""
    FACEBOOK_CONFIG_ID: str = ""
    FACEBOOK_REDIRECT_URI: str = ""
    FACEBOOK_API_VERSION: str = "v26.0"

    # New enquiry submissions; successful idempotent retries are exempt.
    ENQUIRY_SEND_COOLDOWN_SECONDS: int = Field(default=30, ge=0, le=3600)
    ENQUIRY_CREATOR_DAILY_LIMIT: int = Field(default=3, ge=1, le=30)
    ENQUIRY_BLOCK_DUPLICATES: bool = True

    # Notification delivery: development captures mail locally; SMTP is explicit.
    NOTIFICATION_EMAIL_TRANSPORT: str = "sink"
    NOTIFICATION_MAIL_SINK: str = ".mail-sink"
    NOTIFICATION_APP_ORIGIN: str = "http://localhost:3210"
    NOTIFICATION_EMAIL_FROM: str = "Flenzr <notifications@flenzr.test>"
    NOTIFICATION_SMTP_HOST: str = ""
    NOTIFICATION_SMTP_PORT: int = 587
    NOTIFICATION_SMTP_USERNAME: str = ""
    NOTIFICATION_SMTP_PASSWORD: str = ""
    NOTIFICATION_SMTP_STARTTLS: bool = True
    NOTIFICATION_SMTP_SSL: bool = False

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3210",
        "http://127.0.0.1:3210",
        "https://flenzr.com",
        "https://app.flenzr.com",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
