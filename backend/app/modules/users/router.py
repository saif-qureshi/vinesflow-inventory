from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.core.responses import EnvelopeRoute
from app.core.security import hash_password
from app.modules.users.schemas import UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"], route_class=EnvelopeRoute)


@router.get("/me", response_model=UserRead)
def get_my_profile(current_user: CurrentUser) -> CurrentUser:
    return current_user


@router.patch("/me", response_model=UserRead)
def update_my_profile(payload: UserUpdate, current_user: CurrentUser, db: DbSession) -> CurrentUser:
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url or None
    if payload.password is not None:
        current_user.hashed_password = hash_password(payload.password)
    # is_active is not self-serviceable.
    db.commit()
    db.refresh(current_user)
    return current_user
