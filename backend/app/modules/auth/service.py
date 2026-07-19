from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import generate_refresh_token, hash_token
from app.modules.auth.models import RefreshSession


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _expiry() -> datetime:
    return _now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)


def create_session(db: Session, user_id: int, user_agent: str | None = None) -> str:
    """Start a new token family for a fresh login/registration."""
    raw = generate_refresh_token()
    session = RefreshSession(
        user_id=user_id,
        family_id=secrets.token_hex(16),
        token_hash=hash_token(raw),
        expires_at=_expiry(),
        user_agent=user_agent,
    )
    db.add(session)
    db.flush()
    return raw


def get_session_by_raw(db: Session, raw: str) -> RefreshSession | None:
    return db.scalar(select(RefreshSession).where(RefreshSession.token_hash == hash_token(raw)))


def rotate_session(
    db: Session, session: RefreshSession, user_agent: str | None = None
) -> str:
    """Revoke the presented session and issue a new one in the same family."""
    session.revoked_at = _now()
    raw = generate_refresh_token()
    db.add(
        RefreshSession(
            user_id=session.user_id,
            family_id=session.family_id,
            token_hash=hash_token(raw),
            expires_at=_expiry(),
            user_agent=user_agent,
        )
    )
    db.flush()
    return raw


def revoke_family(db: Session, family_id: str) -> None:
    db.execute(
        update(RefreshSession)
        .where(RefreshSession.family_id == family_id, RefreshSession.revoked_at.is_(None))
        .values(revoked_at=_now())
    )
    db.flush()


def revoke_session(db: Session, session: RefreshSession) -> None:
    if session.revoked_at is None:
        session.revoked_at = _now()
        db.flush()


def revoke_all_for_user(db: Session, user_id: int) -> None:
    db.execute(
        update(RefreshSession)
        .where(RefreshSession.user_id == user_id, RefreshSession.revoked_at.is_(None))
        .values(revoked_at=_now())
    )
    db.flush()


def is_expired(session: RefreshSession) -> bool:
    expires = session.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    return expires < _now()
