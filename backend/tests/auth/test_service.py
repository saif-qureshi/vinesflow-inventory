import pytest

from app.core.exceptions import AuthError, ConflictError
from app.modules.auth.service import AuthService


def test_register_user_creates_user_and_session(db):
    auth = AuthService(db)
    user, raw = auth.register_user(
        email="a@test.io", password="password123", full_name="A", org_name="Acme", user_agent=None
    )
    assert user.id is not None
    assert raw
    assert auth.get_session_by_raw(raw) is not None


def test_register_user_duplicate_email_raises_conflict(db):
    auth = AuthService(db)
    auth.register_user(email="a@test.io", password="password123", full_name=None, org_name="A", user_agent=None)
    with pytest.raises(ConflictError):
        auth.register_user(email="a@test.io", password="password123", full_name=None, org_name="B", user_agent=None)


def test_authenticate_wrong_password_raises_auth_error(db):
    auth = AuthService(db)
    auth.register_user(email="a@test.io", password="password123", full_name=None, org_name="A", user_agent=None)
    with pytest.raises(AuthError):
        auth.authenticate(email="a@test.io", password="nope", user_agent=None)


def test_rotate_refresh_token_detects_reuse(db):
    auth = AuthService(db)
    _, raw = auth.register_user(
        email="a@test.io", password="password123", full_name=None, org_name="A", user_agent=None
    )
    # Rotate once, then replay the original token.
    auth.rotate_refresh_token(raw=raw, user_agent=None)
    with pytest.raises(AuthError):
        auth.rotate_refresh_token(raw=raw, user_agent=None)
