import pytest


@pytest.fixture()
def setup(client, register, org_id_of, h):
    token = register()
    hdr = h(token, org_id_of(token))
    uoms = client.get("/api/v1/uoms", headers=hdr).json()["data"]
    uom_id = next(u["id"] for u in uoms if u["symbol"] == "pc")
    pid = client.post(
        "/api/v1/products",
        headers=hdr,
        json={"name": "Widget", "uom_id": uom_id, "track_inventory": True, "reorder_point": 5},
    ).json()["data"]["id"]
    loc_id = client.get("/api/v1/locations", headers=hdr).json()["data"][0]["id"]
    return {"hdr": hdr, "pid": pid, "loc_id": loc_id}


def test_default_location_exists(client, setup):
    locations = client.get("/api/v1/locations", headers=setup["hdr"]).json()["data"]
    assert any(loc["is_default"] and loc["name"] == "Main Warehouse" for loc in locations)


def test_adjust_reflects_in_stock_and_list(client, setup):
    hdr, pid, loc = setup["hdr"], setup["pid"], setup["loc_id"]
    res = client.post(
        "/api/v1/inventory/adjust",
        headers=hdr,
        json={"product_id": pid, "location_id": loc, "qty_delta": 12},
    )
    assert res.status_code == 204

    stock = client.get(f"/api/v1/inventory/{pid}/stock", headers=hdr).json()["data"]
    assert float(stock["on_hand"]) == 12

    items = client.get("/api/v1/inventory", headers=hdr).json()["data"]["items"]
    row = next(i for i in items if i["id"] == pid)
    assert float(row["on_hand"]) == 12 and row["is_low"] is False


def test_low_stock_filter(client, setup):
    hdr, pid, loc = setup["hdr"], setup["pid"], setup["loc_id"]
    client.post(
        "/api/v1/inventory/adjust", headers=hdr, json={"product_id": pid, "location_id": loc, "qty_delta": 2}
    )
    low = client.get("/api/v1/inventory?low_stock=true", headers=hdr).json()["data"]["items"]
    assert any(i["id"] == pid and i["is_low"] for i in low)
