from datetime import date, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import select

from app.core.exceptions import BadRequestError, NotFoundError
from app.core.security import hash_password
from app.modules.documents.enums import DocumentStatus
from app.modules.documents.models import TaxRate
from app.modules.documents.schemas import (
    DocumentLineInput,
    InvoiceCreate,
    InvoiceListQuery,
    InvoiceUpdate,
)
from app.modules.documents.service import DocumentService
from app.modules.inventory.models import StockMovement
from app.modules.inventory.schemas import OpeningStockInput
from app.modules.inventory.service import InventoryService
from app.modules.locations.models import Location
from app.modules.orgs.service import OrgService
from app.modules.parties.models import Party
from app.modules.products.models import Product
from app.modules.users.models import User


def _setup(db, *, track=True):
    user = User(email="d@test.io", hashed_password=hash_password("password123"))
    db.add(user)
    db.flush()
    org = OrgService(db).create_org_with_owner(owner=user, name="Acme")
    db.flush()
    loc = db.scalar(select(Location).where(Location.org_id == org.id))
    party = Party(org_id=org.id, is_customer=True, name="Beta Corp", payment_term_days=15)
    product = Product(
        org_id=org.id,
        name="Widget",
        type="single",
        track_inventory=track,
        sale_price=Decimal("100"),
        purchase_price=Decimal("60"),
    )
    db.add_all([party, product])
    db.flush()
    return org.id, loc.id, party.id, product.id


def _tax(db, org_id, name="GST 18%"):
    return db.scalar(select(TaxRate).where(TaxRate.org_id == org_id, TaxRate.name == name))


def _line(pid, tax_id, qty=2, price=Decimal("100"), discount=Decimal("0")):
    return DocumentLineInput(
        product_id=pid, description="Widget", quantity=Decimal(qty),
        unit_price=price, discount=discount, tax_rate_id=tax_id,
    )


def test_org_creation_seeds_tax_rates(db):
    org_id, *_ = _setup(db)
    names = set(db.scalars(select(TaxRate.name).where(TaxRate.org_id == org_id)))
    assert names == {"GST 18%", "Exempt"}


def test_create_invoice_numbers_and_totals(db):
    org_id, loc_id, party_id, pid = _setup(db)
    svc = DocumentService(db)
    tax = _tax(db, org_id)
    inv = svc.create_invoice(
        org_id, InvoiceCreate(party_id=party_id, lines=[_line(pid, tax.id)])
    )
    assert inv.number.startswith("INV-")
    assert inv.status == DocumentStatus.DRAFT
    assert inv.subtotal == Decimal("200")
    assert inv.tax_total == Decimal("36")
    assert inv.total == Decimal("236")
    assert inv.balance_due == Decimal("236")
    assert inv.due_date == inv.issue_date + timedelta(days=15)


def test_invoice_numbers_increment(db):
    org_id, loc_id, party_id, pid = _setup(db)
    svc = DocumentService(db)
    tax = _tax(db, org_id)
    a = svc.create_invoice(org_id, InvoiceCreate(party_id=party_id, lines=[_line(pid, tax.id)]))
    b = svc.create_invoice(org_id, InvoiceCreate(party_id=party_id, lines=[_line(pid, tax.id)]))
    assert a.number == "INV-0001"
    assert b.number == "INV-0002"


def test_discount_and_exempt_rate(db):
    org_id, loc_id, party_id, pid = _setup(db)
    svc = DocumentService(db)
    exempt = _tax(db, org_id, "Exempt")
    inv = svc.create_invoice(
        org_id,
        InvoiceCreate(
            party_id=party_id,
            lines=[_line(pid, exempt.id, qty=2, price=Decimal("100"), discount=Decimal("25"))],
        ),
    )
    assert inv.subtotal == Decimal("200")
    assert inv.discount_total == Decimal("25")
    assert inv.tax_total == Decimal("0")
    assert inv.total == Decimal("175")


def test_create_invoice_unknown_party_raises(db):
    org_id, loc_id, party_id, pid = _setup(db)
    svc = DocumentService(db)
    tax = _tax(db, org_id)
    with pytest.raises(NotFoundError):
        svc.create_invoice(org_id, InvoiceCreate(party_id=999999, lines=[_line(pid, tax.id)]))


def test_finalize_ships_stock(db):
    org_id, loc_id, party_id, pid = _setup(db)
    InventoryService(db).set_opening(
        org_id, OpeningStockInput(product_id=pid, location_id=loc_id, quantity=Decimal(10))
    )
    svc = DocumentService(db)
    tax = _tax(db, org_id)
    inv = svc.create_invoice(
        org_id,
        InvoiceCreate(party_id=party_id, warehouse_id=loc_id, lines=[_line(pid, tax.id)]),
    )
    svc.finalize(org_id, inv.id)
    assert inv.status == DocumentStatus.SENT
    assert InventoryService(db).item_stock(org_id, pid).on_hand == Decimal(8)
    movement = db.scalar(
        select(StockMovement).where(
            StockMovement.reference_type == "invoice", StockMovement.reference_id == inv.id
        )
    )
    assert movement.qty_delta == Decimal(-2)
    assert movement.unit_cost == Decimal("60")


def test_finalize_only_from_draft(db):
    org_id, loc_id, party_id, pid = _setup(db, track=False)
    svc = DocumentService(db)
    tax = _tax(db, org_id)
    inv = svc.create_invoice(org_id, InvoiceCreate(party_id=party_id, lines=[_line(pid, tax.id)]))
    svc.finalize(org_id, inv.id)
    with pytest.raises(BadRequestError):
        svc.finalize(org_id, inv.id)


def test_void_reverses_stock(db):
    org_id, loc_id, party_id, pid = _setup(db)
    InventoryService(db).set_opening(
        org_id, OpeningStockInput(product_id=pid, location_id=loc_id, quantity=Decimal(10))
    )
    svc = DocumentService(db)
    tax = _tax(db, org_id)
    inv = svc.create_invoice(
        org_id, InvoiceCreate(party_id=party_id, warehouse_id=loc_id, lines=[_line(pid, tax.id)])
    )
    svc.finalize(org_id, inv.id)
    svc.void(org_id, inv.id)
    assert inv.status == DocumentStatus.VOID
    assert InventoryService(db).item_stock(org_id, pid).on_hand == Decimal(10)


def test_update_only_draft(db):
    org_id, loc_id, party_id, pid = _setup(db, track=False)
    svc = DocumentService(db)
    tax = _tax(db, org_id)
    inv = svc.create_invoice(org_id, InvoiceCreate(party_id=party_id, lines=[_line(pid, tax.id)]))
    svc.update_invoice(org_id, inv.id, InvoiceUpdate(lines=[_line(pid, tax.id, qty=5)]))
    assert inv.subtotal == Decimal("500")
    svc.finalize(org_id, inv.id)
    with pytest.raises(BadRequestError):
        svc.update_invoice(org_id, inv.id, InvoiceUpdate(reference="X"))


def test_delete_only_draft(db):
    org_id, loc_id, party_id, pid = _setup(db, track=False)
    svc = DocumentService(db)
    tax = _tax(db, org_id)
    inv = svc.create_invoice(org_id, InvoiceCreate(party_id=party_id, lines=[_line(pid, tax.id)]))
    svc.delete(org_id, inv.id)
    other = svc.create_invoice(org_id, InvoiceCreate(party_id=party_id, lines=[_line(pid, tax.id)]))
    svc.finalize(org_id, other.id)
    with pytest.raises(BadRequestError):
        svc.delete(org_id, other.id)


def test_list_and_filter(db):
    org_id, loc_id, party_id, pid = _setup(db, track=False)
    svc = DocumentService(db)
    tax = _tax(db, org_id)
    a = svc.create_invoice(org_id, InvoiceCreate(party_id=party_id, lines=[_line(pid, tax.id)]))
    svc.create_invoice(org_id, InvoiceCreate(party_id=party_id, lines=[_line(pid, tax.id)]))
    svc.finalize(org_id, a.id)
    items, _, _ = svc.list_invoices(org_id, InvoiceListQuery())
    assert len(items) == 2
    drafts, _, _ = svc.list_invoices(org_id, InvoiceListQuery(status="draft"))
    assert len(drafts) == 1


def test_sellable_items(db):
    org_id, loc_id, party_id, pid = _setup(db, track=False)
    svc = DocumentService(db)
    items = svc.sellable_items(org_id, None, 20)
    assert [i.id for i in items] == [pid]
    assert items[0].sale_price == Decimal("100")
