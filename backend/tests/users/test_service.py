from app.core.security import hash_password, verify_password
from app.modules.users.models import User
from app.modules.users.schemas import UserUpdate
from app.modules.users.service import UserService


def _user(db) -> User:
    user = User(email="u@test.io", hashed_password=hash_password("password123"))
    db.add(user)
    db.flush()
    return user


def test_update_profile_sets_fields(db):
    user = _user(db)
    updated = UserService(db).update_profile(
        user, UserUpdate(full_name="New Name", avatar_url="https://x/a.png")
    )
    assert updated.full_name == "New Name"
    assert updated.avatar_url == "https://x/a.png"


def test_update_profile_hashes_new_password(db):
    user = _user(db)
    UserService(db).update_profile(user, UserUpdate(password="brandnew123"))
    assert verify_password("brandnew123", user.hashed_password)


def test_blank_avatar_url_clears_to_none(db):
    user = _user(db)
    user.avatar_url = "https://x/a.png"
    db.flush()
    UserService(db).update_profile(user, UserUpdate(avatar_url=""))
    assert user.avatar_url is None
