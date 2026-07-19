from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    PROJECT_NAME: str = "Vineflow Invoicing API"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"

    DATABASE_URL: str = "postgresql+psycopg://vineflow:vineflow@localhost:5432/vineflow"

    JWT_SECRET: str = "change-me-to-a-long-random-string"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # httpOnly cookie that carries the (opaque) refresh token.
    REFRESH_COOKIE_NAME: str = "vf_refresh"
    REFRESH_COOKIE_PATH: str = "/api/v1/auth"
    REFRESH_COOKIE_SECURE: bool = False
    REFRESH_COOKIE_SAMESITE: str = "lax"
    REFRESH_COOKIE_DOMAIN: str | None = None

    BACKEND_CORS_ORIGINS: Annotated[list[str], NoDecode] = ["http://localhost:3000"]

    # Media storage: "local" (dev, served from disk) or "s3".
    STORAGE_BACKEND: str = "local"
    MEDIA_LOCAL_DIR: str = "media_storage"
    MEDIA_PUBLIC_URL: str = "http://localhost:8000"
    MAX_UPLOAD_MB: int = 5
    S3_BUCKET: str | None = None
    S3_REGION: str | None = None
    S3_ENDPOINT_URL: str | None = None
    S3_PUBLIC_URL: str | None = None

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def _split_cors(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
