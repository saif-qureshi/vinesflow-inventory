import pytest

from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password
from app.modules.categories.schemas import CategoryCreate, CategoryUpdate
from app.modules.categories.service import CategoryService
from app.modules.orgs.service import OrgService
from app.modules.users.models import User


def _org(db) -> int:
    user = User(email="o@test.io", hashed_password=hash_password("password123"))
    db.add(user)
    db.flush()
    org = OrgService(db).create_org_with_owner(owner=user, name="Acme")
    db.flush()
    return org.id


def test_create_requires_existing_parent(db):
    org_id = _org(db)
    with pytest.raises(NotFoundError):
        CategoryService(db).create(org_id, CategoryCreate(name="Child", parent_id=9999))


def test_duplicate_name_raises_conflict(db):
    org_id = _org(db)
    svc = CategoryService(db)
    svc.create(org_id, CategoryCreate(name="Tools"))
    with pytest.raises(ConflictError):
        svc.create(org_id, CategoryCreate(name="Tools"))


def test_category_cannot_be_its_own_parent(db):
    org_id = _org(db)
    svc = CategoryService(db)
    cat = svc.create(org_id, CategoryCreate(name="Root"))
    with pytest.raises(ConflictError):
        svc.update(org_id, cat.id, CategoryUpdate(parent_id=cat.id))
