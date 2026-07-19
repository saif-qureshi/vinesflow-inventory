import pytest

from app.core.exceptions import ConflictError
from app.core.security import hash_password
from app.modules.locations.schemas import LocationCreate
from app.modules.locations.service import LocationService
from app.modules.orgs.service import OrgService
from app.modules.users.models import User


def _org(db) -> int:
    user = User(email="l@test.io", hashed_password=hash_password("password123"))
    db.add(user)
    db.flush()
    org = OrgService(db).create_org_with_owner(owner=user, name="Acme")
    db.flush()
    return org.id


def test_default_seeded_on_org_create(db):
    org_id = _org(db)
    locations = LocationService(db).list(org_id)
    assert len(locations) == 1 and locations[0].is_default


def test_only_one_default(db):
    org_id = _org(db)
    svc = LocationService(db)
    new_default = svc.create(org_id, LocationCreate(name="Store B", is_default=True))
    defaults = [loc for loc in svc.list(org_id) if loc.is_default]
    assert len(defaults) == 1 and defaults[0].id == new_default.id


def test_cannot_delete_default(db):
    org_id = _org(db)
    svc = LocationService(db)
    default = next(loc for loc in svc.list(org_id) if loc.is_default)
    with pytest.raises(ConflictError):
        svc.delete(org_id, default.id)
