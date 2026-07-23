from __future__ import annotations

from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


@lru_cache
def _cipher() -> Fernet:
    key = settings.FBR_ENCRYPTION_KEY
    if not key:
        raise RuntimeError("FBR_ENCRYPTION_KEY is not configured")
    return Fernet(key.encode())


def encrypt_secret(value: str) -> str:
    return _cipher().encrypt(value.encode()).decode()


def decrypt_secret(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return _cipher().decrypt(value.encode()).decode()
    except InvalidToken:
        return None
