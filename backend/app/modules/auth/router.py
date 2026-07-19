from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.api.deps import CurrentUser, DbSession
from app.core.config import settings
from app.core.responses import EnvelopeRoute, error_body
from app.core.security import create_access_token, hash_password, verify_password
from app.modules.auth import service
from app.modules.auth.cookies import clear_refresh_cookie, set_refresh_cookie
from app.modules.auth.schemas import (
    LoginRequest,
    MeResponse,
    MessageResponse,
    RegisterRequest,
    TokenResponse,
)
from app.modules.orgs.models import Membership
from app.modules.orgs.service import create_org_with_owner
from app.modules.users.models import User

router = APIRouter(prefix="/auth", tags=["auth"], route_class=EnvelopeRoute)


def _issue_login(db: DbSession, response: Response, user: User, request: Request) -> TokenResponse:
    raw = service.create_session(db, user.id, request.headers.get("user-agent"))
    db.commit()
    set_refresh_cookie(response, raw)
    return TokenResponse(access_token=create_access_token(user.id))


def _refresh_error(message: str) -> JSONResponse:
    resp = JSONResponse(
        error_body("http_401", message), status_code=status.HTTP_401_UNAUTHORIZED
    )
    clear_refresh_cookie(resp)
    return resp


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, request: Request, response: Response, db: DbSession):
    if db.scalar(select(User.id).where(User.email == payload.email.lower())) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.flush()
    create_org_with_owner(db, owner=user, name=payload.org_name)
    return _issue_login(db, response, user, request)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, response: Response, db: DbSession):
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")
    return _issue_login(db, response, user, request)


@router.post("/refresh", response_model=TokenResponse)
def refresh(request: Request, response: Response, db: DbSession):
    raw = request.cookies.get(settings.REFRESH_COOKIE_NAME)
    if not raw:
        return _refresh_error("Missing refresh token")

    session = service.get_session_by_raw(db, raw)
    if session is None:
        return _refresh_error("Invalid refresh token")

    # A revoked token being replayed means the chain leaked: kill the family.
    if session.revoked_at is not None:
        service.revoke_family(db, session.family_id)
        db.commit()
        return _refresh_error("Refresh token reuse detected")

    if service.is_expired(session):
        service.revoke_session(db, session)
        db.commit()
        return _refresh_error("Refresh token expired")

    new_raw = service.rotate_session(db, session, request.headers.get("user-agent"))
    db.commit()
    set_refresh_cookie(response, new_raw)
    return TokenResponse(access_token=create_access_token(session.user_id))


@router.post("/logout", response_model=MessageResponse)
def logout(request: Request, response: Response, db: DbSession):
    raw = request.cookies.get(settings.REFRESH_COOKIE_NAME)
    if raw:
        session = service.get_session_by_raw(db, raw)
        if session is not None:
            service.revoke_family(db, session.family_id)
            db.commit()
    clear_refresh_cookie(response)
    return MessageResponse(message="Logged out")


@router.post("/logout-all", response_model=MessageResponse)
def logout_all(current_user: CurrentUser, response: Response, db: DbSession):
    service.revoke_all_for_user(db, current_user.id)
    db.commit()
    clear_refresh_cookie(response)
    return MessageResponse(message="All sessions revoked")


@router.get("/me", response_model=MeResponse)
def me(current_user: CurrentUser, db: DbSession) -> MeResponse:
    memberships = db.scalars(
        select(Membership)
        .where(Membership.user_id == current_user.id)
        .options(joinedload(Membership.organization), joinedload(Membership.role))
        .order_by(Membership.created_at)
    ).all()
    return MeResponse(user=current_user, memberships=memberships)
