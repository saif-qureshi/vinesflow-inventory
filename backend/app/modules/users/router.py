from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser
from app.core.container import Provide
from app.core.responses import EnvelopeRoute
from app.modules.users.schemas import UserRead, UserUpdate
from app.modules.users.service import UserService

router = APIRouter(prefix="/users", tags=["users"], route_class=EnvelopeRoute)

UserSvc = Depends(Provide(UserService))


@router.get("/me", response_model=UserRead)
def get_my_profile(current_user: CurrentUser) -> CurrentUser:
    return current_user


@router.patch("/me", response_model=UserRead)
def update_my_profile(
    payload: UserUpdate, current_user: CurrentUser, users: UserService = UserSvc
) -> CurrentUser:
    return users.update_profile(current_user, payload)
