from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Trikal"
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "change-me-in-production"
    BACKEND_PORT: int = 8310
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://trikal:change-me@postgres:5432/trikal_db"

    # Redis
    REDIS_URL: str = "redis://redis:6379"

    # Qdrant (future)
    QDRANT_URL: str | None = None

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:4310"]

    # OpenID Connect (Trishul IAM)
    OIDC_CLIENT_ID: str
    OIDC_CLIENT_SECRET: str
    OIDC_AUDIENCE: str
    OIDC_ISSUER: str = "https://identity.trishuliam.com"
    OIDC_REDIRECT_URI: str = "http://localhost:8310/api/v1/auth/callback"
    FRONTEND_URL: str = "http://localhost:4310/auth/callback"
    FRONTEND_LOGOUT_URL: str = "http://localhost:4310/login"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
