def test_create_list_update_delete_uom(client, register, org_id_of, h):
    token = register()
    hdr = h(token, org_id_of(token))

    created = client.post("/api/v1/uoms", headers=hdr, json={"name": "Kilogram", "symbol": "kg"})
    assert created.status_code == 201
    uom = created.json()["data"]
    assert uom["symbol"] == "kg"

    assert [u["name"] for u in client.get("/api/v1/uoms", headers=hdr).json()["data"]] == ["Kilogram"]

    upd = client.patch(f"/api/v1/uoms/{uom['id']}", headers=hdr, json={"symbol": "KG"})
    assert upd.json()["data"]["symbol"] == "KG"

    assert client.delete(f"/api/v1/uoms/{uom['id']}", headers=hdr).status_code == 204


def test_duplicate_uom_name_conflicts(client, register, org_id_of, h):
    token = register()
    hdr = h(token, org_id_of(token))
    client.post("/api/v1/uoms", headers=hdr, json={"name": "Piece", "symbol": "pc"})
    dup = client.post("/api/v1/uoms", headers=hdr, json={"name": "Piece", "symbol": "pcs"})
    assert dup.status_code == 409
