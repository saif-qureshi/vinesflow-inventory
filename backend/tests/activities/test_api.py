def _uom_id(client, hdr) -> int:
    uoms = client.get("/api/v1/uoms", headers=hdr).json()["data"]
    return next(u["id"] for u in uoms if u["symbol"] == "pc")


def test_feed_records_actor_and_summary(client, register, org_id_of, h):
    token = register()
    hdr = h(token, org_id_of(token))
    client.post("/api/v1/products", headers=hdr, json={"name": "iPhone", "uom_id": _uom_id(client, hdr)})

    feed = client.get("/api/v1/activities", headers=hdr).json()["data"]["items"]
    assert feed
    top = feed[0]
    assert top["action"] == "created"
    assert top["entity_type"] == "product"
    assert top["summary"] == "iPhone"
    assert top["actor"]["email"]


def test_feed_orders_newest_first(client, register, org_id_of, h):
    token = register()
    hdr = h(token, org_id_of(token))
    uom_id = _uom_id(client, hdr)
    client.post("/api/v1/products", headers=hdr, json={"name": "First", "uom_id": uom_id})
    client.post("/api/v1/products", headers=hdr, json={"name": "Second", "uom_id": uom_id})

    feed = client.get("/api/v1/activities", headers=hdr).json()["data"]["items"]
    assert [a["summary"] for a in feed[:2]] == ["Second", "First"]


def test_feed_requires_auth(client):
    assert client.get("/api/v1/activities").status_code in (401, 400)
