from decimal import Decimal

from cryptography.fernet import Fernet

from app.core import crypto
from app.core.config import settings
from app.core.crypto import decrypt_secret
from app.core.security import hash_password
from app.modules.fbr.models import FbrReferenceData
from app.modules.fbr.service import FbrService
from app.modules.orgs.schemas import OrgUpdate
from app.modules.orgs.service import OrgService
from app.modules.users.models import User


def _seed_reference(db):
    db.add_all([
        FbrReferenceData(type="sale_type", code="75", description="Goods at standard rate"),
        FbrReferenceData(type="sale_type", code="122", description="Mobile Phones"),
        FbrReferenceData(type="tax_rate", code="728", description="18%", value=Decimal("18"),
                         parent_type="sale_type", parent_code="75"),
        FbrReferenceData(type="tax_rate", code="280", description="0%", value=Decimal("0"),
                         parent_type="sale_type", parent_code="75"),
        FbrReferenceData(type="hs_code", code="8517.1300", description="CELLULAR TELEPHONE"),
    ])
    db.flush()


def test_provinces_are_the_fbr_seven(db):
    provinces = FbrService(db).provinces()
    values = {p.value for p in provinces}
    assert len(provinces) == 7
    assert "SINDH" in values and "KHYBER PAKHTUNKHWA" in values


def test_reference_flat_and_search(db):
    _seed_reference(db)
    svc = FbrService(db)
    sale_types = svc.reference("sale_type", None, None, 50)
    assert {s.code for s in sale_types} == {"75", "122"}
    found = svc.reference("hs_code", None, "cellular", 50)
    assert [h.code for h in found] == ["8517.1300"]


def test_reference_conditional_by_parent(db):
    _seed_reference(db)
    rates = FbrService(db).reference("tax_rate", "75", None, 50)
    assert {r.code for r in rates} == {"728", "280"}
    none = FbrService(db).reference("tax_rate", "999", None, 50)
    assert none == []


def test_org_token_is_encrypted_and_write_only(db, monkeypatch):
    monkeypatch.setattr(settings, "FBR_ENCRYPTION_KEY", Fernet.generate_key().decode())
    crypto._cipher.cache_clear()

    user = User(email="fbr@test.io", hashed_password=hash_password("password123"))
    db.add(user)
    db.flush()
    org = OrgService(db).create_org_with_owner(owner=user, name="Acme")
    db.flush()
    membership = org.memberships[0]

    OrgService(db).update_org(
        membership=membership,
        payload=OrgUpdate(fbr_enabled=True, fbr_province="SINDH", fbr_sandbox_token="tok-abc"),
    )
    db.refresh(org)

    assert org.fbr_enabled is True
    assert org.fbr_sandbox_token != "tok-abc"
    assert decrypt_secret(org.fbr_sandbox_token) == "tok-abc"
    assert org.fbr_sandbox_configured is True
    assert org.fbr_production_configured is False
    crypto._cipher.cache_clear()
