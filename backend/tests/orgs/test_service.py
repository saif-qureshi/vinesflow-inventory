import pytest
from sqlalchemy import select

from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password
from app.modules.orgs.models import Membership
from app.modules.orgs.schemas import MemberAdd
from app.modules.orgs.service import OrgService
from app.modules.rbac.service import RbacService
from app.modules.users.models import User


def _user(db, email: str = "u@test.io") -> User:
    user = User(email=email, hashed_password=hash_password("password123"))
    db.add(user)
    db.flush()
    return user


def test_create_org_with_owner_seeds_roles_and_owner(db):
    owner = _user(db)
    org = OrgService(db).create_org_with_owner(owner=owner, name="Acme")
    db.flush()

    roles = RbacService(db).list_roles(org.id)
    assert {r.slug for r in roles} == {"super_admin", "admin", "member", "viewer"}

    membership = db.scalar(
        select(Membership).where(Membership.org_id == org.id, Membership.user_id == owner.id)
    )
    assert membership is not None
    assert membership.is_owner is True
    assert membership.role.slug == "super_admin"


def test_permissions_for_owner_returns_all(db):
    owner = _user(db)
    org = OrgService(db).create_org_with_owner(owner=owner, name="Acme")
    db.flush()
    membership = db.scalar(
        select(Membership).where(Membership.org_id == org.id, Membership.user_id == owner.id)
    )
    perms = OrgService.permissions_for(membership)
    assert "orgs:delete" in perms


def test_unique_slug_disambiguates(db):
    owner = _user(db)
    svc = OrgService(db)
    a = svc.create_org_with_owner(owner=owner, name="Acme")
    b = svc.create_org_with_owner(owner=owner, name="Acme")
    db.flush()
    assert a.slug != b.slug


def test_add_member_unknown_user_raises_not_found(db):
    owner = _user(db)
    svc = OrgService(db)
    org = svc.create_org_with_owner(owner=owner, name="Acme")
    db.flush()
    role = RbacService(db).list_roles(org.id)[0]
    with pytest.raises(NotFoundError):
        svc.add_member(org_id=org.id, payload=MemberAdd(email="ghost@test.io", role_id=role.id))


def test_add_existing_member_raises_conflict(db):
    owner = _user(db, "owner@test.io")
    member = _user(db, "member@test.io")
    svc = OrgService(db)
    org = svc.create_org_with_owner(owner=owner, name="Acme")
    db.flush()
    role = next(r for r in RbacService(db).list_roles(org.id) if r.slug == "member")
    svc.add_member(org_id=org.id, payload=MemberAdd(email=member.email, role_id=role.id))
    with pytest.raises(ConflictError):
        svc.add_member(org_id=org.id, payload=MemberAdd(email=member.email, role_id=role.id))
