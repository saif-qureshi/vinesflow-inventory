from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.modules.users.models import User
from app.modules.users.schemas import UserUpdate


class UserService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def update_profile(self, user: User, payload: UserUpdate) -> User:
        if payload.full_name is not None:
            user.full_name = payload.full_name
        if payload.avatar_url is not None:
            user.avatar_url = payload.avatar_url or None
        if payload.password is not None:
            user.hashed_password = hash_password(payload.password)
        self.db.commit()
        self.db.refresh(user)
        return user
