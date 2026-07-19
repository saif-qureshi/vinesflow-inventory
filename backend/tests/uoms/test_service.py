import pytest

from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password
from app.modules.orgs.service import OrgService
from app.modules.uoms.schemas import UomCreate
from app.modules.uoms.service import UomService
from app.modules.users.models import User


def _org(db) -> int:
    user = User(email="o@test.io", hashed_password=hash_password("password123"))
    db.add(user)
    db.flush()
    org = OrgService(db).create_org_with_owner(owner=user, name="Acme")
    db.flush()
    return org.id


def test_create_and_get_uom(db):
    org_id = _org(db)
    svc = UomService(db)
    uom = svc.create(org_id, UomCreate(name="Box", symbol="bx"))
    assert svc.get(org_id, uom.id).symbol == "bx"


def test_duplicate_name_raises_conflict(db):
    org_id = _org(db)
    svc = UomService(db)
    svc.create(org_id, UomCreate(name="Litre", symbol="L"))
    with pytest.raises(ConflictError):
        svc.create(org_id, UomCreate(name="Litre", symbol="l"))


def test_get_missing_uom_raises_not_found(db):
    org_id = _org(db)
    with pytest.raises(NotFoundError):
        UomService(db).get(org_id, 12345)
