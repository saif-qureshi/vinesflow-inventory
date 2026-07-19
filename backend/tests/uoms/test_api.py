def test_create_list_update_delete_uom(client, register, org_id_of, h):
    token = register()
    hdr = h(token, org_id_of(token))

    created = client.post("/api/v1/uoms", headers=hdr, json={"name": "Carton", "symbol": "ctn"})
    assert created.status_code == 201
    uom = created.json()["data"]
    assert uom["symbol"] == "ctn"

    assert "Carton" in [u["name"] for u in client.get("/api/v1/uoms", headers=hdr).json()["data"]]

    upd = client.patch(f"/api/v1/uoms/{uom['id']}", headers=hdr, json={"symbol": "CTN"})
    assert upd.json()["data"]["symbol"] == "CTN"

    assert client.delete(f"/api/v1/uoms/{uom['id']}", headers=hdr).status_code == 204


def test_default_uoms_seeded_for_new_org(client, register, org_id_of, h):
    token = register()
    hdr = h(token, org_id_of(token))
    names = [u["name"] for u in client.get("/api/v1/uoms", headers=hdr).json()["data"]]
    assert "Piece" in names and "Kilogram" in names


def test_duplicate_uom_name_conflicts(client, register, org_id_of, h):
    token = register()
    hdr = h(token, org_id_of(token))
    client.post("/api/v1/uoms", headers=hdr, json={"name": "Carton", "symbol": "ctn"})
    dup = client.post("/api/v1/uoms", headers=hdr, json={"name": "Carton", "symbol": "ctns"})
    assert dup.status_code == 409
