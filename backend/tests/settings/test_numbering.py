import pytest

from app.core.exceptions import BadRequestError
from app.core.security import hash_password
from app.modules.orgs.service import OrgService
from app.modules.settings.schemas import NumberingEntryUpdate
from app.modules.settings.service import SettingsService
from app.modules.users.models import User


def _org(db):
    user = User(email="s@test.io", hashed_password=hash_password("password123"))
    db.add(user)
    db.flush()
    org = OrgService(db).create_org_with_owner(owner=user, name="Acme")
    db.flush()
    return org.id


def test_numbering_entries_seeded_with_defaults(db):
    org_id = _org(db)
    entries = {e["key"]: e for e in SettingsService(db).numbering_entries(org_id)}
    assert entries["invoice"]["label"] == "Invoice"
    assert entries["invoice"]["prefix"] == "INV-"
    assert entries["invoice"]["start"] == "0001"
    assert entries["invoice"]["restart"] == "none"
    assert entries["payment_received"]["prefix"] == "PAY-"


def test_set_numbering_updates_and_persists(db):
    org_id = _org(db)
    svc = SettingsService(db)
    svc.set_numbering(
        org_id,
        [NumberingEntryUpdate(key="invoice", prefix="INV/2026/", start="000100", restart="yearly")],
    )
    entries = {e["key"]: e for e in svc.numbering_entries(org_id)}
    assert entries["invoice"]["prefix"] == "INV/2026/"
    assert entries["invoice"]["start"] == "000100"
    assert entries["invoice"]["restart"] == "yearly"
    assert entries["bill"]["prefix"] == "BILL-"


def test_set_numbering_rejects_unknown_key(db):
    org_id = _org(db)
    with pytest.raises(BadRequestError):
        SettingsService(db).set_numbering(
            org_id, [NumberingEntryUpdate(key="not_a_doc", prefix="X-", start="0001")]
        )
