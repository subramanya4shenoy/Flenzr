from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
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

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        "http://localhost:8000",
        "http://localhost:8002",
        "http://127.0.0.1:8002",
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
