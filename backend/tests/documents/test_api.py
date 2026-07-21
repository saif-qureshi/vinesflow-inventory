from decimal import Decimal

from sqlalchemy import select

from app.modules.documents.models import TaxRate
from app.modules.parties.models import Party
from app.modules.products.models import Product


def _seed(db, org_id, track=False):
    party = Party(org_id=org_id, is_customer=True, name="Beta Corp")
    product = Product(
        org_id=org_id,
        name="Widget",
        type="single",
        track_inventory=track,
        sale_price=Decimal("50"),
        purchase_price=Decimal("30"),
    )
    db.add_all([party, product])
    db.flush()
    tax = db.scalar(select(TaxRate).where(TaxRate.org_id == org_id, TaxRate.name == "GST 18%"))
    return party.id, product.id, tax.id


def test_invoice_flow(client, db, register, org_id_of, h):
    token = register()
    org_id = org_id_of(token)
    headers = h(token, org_id)
    party_id, pid, tax_id = _seed(db, org_id)

    res = client.post(
        "/api/v1/invoices",
        headers=headers,
        json={
            "party_id": party_id,
            "lines": [
                {
                    "product_id": pid,
                    "description": "Widget",
                    "quantity": 2,
                    "unit_price": 50,
                    "tax_rate_id": tax_id,
                }
            ],
        },
    )
    assert res.status_code == 201, res.text
    data = res.json()["data"]
    assert data["number"].startswith("INV-")
    assert Decimal(str(data["subtotal"])) == Decimal("100")
    assert Decimal(str(data["tax_total"])) == Decimal("18")
    assert Decimal(str(data["total"])) == Decimal("118")
    inv_id = data["id"]

    got = client.get(f"/api/v1/invoices/{inv_id}", headers=headers)
    assert got.status_code == 200
    assert got.json()["data"]["party"]["name"] == "Beta Corp"

    fin = client.post(f"/api/v1/invoices/{inv_id}/finalize", headers=headers)
    assert fin.status_code == 200
    assert fin.json()["data"]["status"] == "sent"

    listed = client.get("/api/v1/invoices", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()["data"]["items"]) == 1


def test_tax_rates_and_sellable(client, db, register, org_id_of, h):
    token = register()
    org_id = org_id_of(token)
    headers = h(token, org_id)
    _, pid, _ = _seed(db, org_id)

    rates = client.get("/api/v1/tax-rates", headers=headers)
    assert rates.status_code == 200
    assert "GST 18%" in {r["name"] for r in rates.json()["data"]}

    items = client.get("/api/v1/sellable-items", headers=headers)
    assert items.status_code == 200
    assert any(i["id"] == pid for i in items.json()["data"])


def test_requires_auth(client):
    res = client.get("/api/v1/invoices")
    assert res.status_code == 401


def test_bill_flow(client, db, register, org_id_of, h):
    token = register()
    org_id = org_id_of(token)
    headers = h(token, org_id)
    vendor = Party(org_id=org_id, is_vendor=True, name="Supplier")
    product = Product(
        org_id=org_id, name="Bolt", type="single", track_inventory=False,
        purchase_price=Decimal("10"),
    )
    db.add_all([vendor, product])
    db.flush()
    tax = db.scalar(select(TaxRate).where(TaxRate.org_id == org_id, TaxRate.name == "GST 18%"))

    res = client.post(
        "/api/v1/bills",
        headers=headers,
        json={
            "party_id": vendor.id,
            "lines": [
                {
                    "product_id": product.id,
                    "description": "Bolt",
                    "quantity": 3,
                    "unit_price": 10,
                    "tax_rate_id": tax.id,
                }
            ],
        },
    )
    assert res.status_code == 201, res.text
    data = res.json()["data"]
    assert data["number"].startswith("BILL-")
    assert data["type"] == "bill"

    fin = client.post(f"/api/v1/bills/{data['id']}/finalize", headers=headers)
    assert fin.status_code == 200
    assert fin.json()["data"]["status"] == "sent"

    listed = client.get("/api/v1/bills", headers=headers)
    assert len(listed.json()["data"]["items"]) == 1
