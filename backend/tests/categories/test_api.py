def test_create_list_and_nest_categories(client, register, org_id_of, h):
    token = register()
    org = org_id_of(token)
    hdr = h(token, org)

    parent = client.post("/api/v1/categories", headers=hdr, json={"name": "Electronics"})
    assert parent.status_code == 201
    parent_id = parent.json()["data"]["id"]

    child = client.post(
        "/api/v1/categories", headers=hdr, json={"name": "Phones", "parent_id": parent_id}
    )
    assert child.status_code == 201
    assert child.json()["data"]["parent_id"] == parent_id

    listed = client.get("/api/v1/categories", headers=hdr).json()["data"]
    assert {c["name"] for c in listed} == {"Electronics", "Phones"}


def test_duplicate_category_name_conflicts(client, register, org_id_of, h):
    token = register()
    hdr = h(token, org_id_of(token))
    client.post("/api/v1/categories", headers=hdr, json={"name": "Tools"})
    dup = client.post("/api/v1/categories", headers=hdr, json={"name": "Tools"})
    assert dup.status_code == 409
    assert dup.json()["error"]["code"] == "conflict"


def test_update_and_delete_category(client, register, org_id_of, h):
    token = register()
    hdr = h(token, org_id_of(token))
    cid = client.post("/api/v1/categories", headers=hdr, json={"name": "Old"}).json()["data"]["id"]
    upd = client.patch(f"/api/v1/categories/{cid}", headers=hdr, json={"name": "New"})
    assert upd.status_code == 200 and upd.json()["data"]["name"] == "New"
    assert client.delete(f"/api/v1/categories/{cid}", headers=hdr).status_code == 204


def test_viewer_cannot_create_category(client, register, org_id_of, h):
    owner = register(email="owner@test.io", org="Acme")
    org = org_id_of(owner)
    viewer = register(email="viewer@test.io", org="Personal")
    viewer_role = next(
        r for r in client.get("/api/v1/roles", headers=h(owner, org)).json()["data"]
        if r["slug"] == "viewer"
    )
    client.post(
        "/api/v1/orgs/current/members",
        headers=h(owner, org),
        json={"email": "viewer@test.io", "role_id": viewer_role["id"]},
    )
    res = client.post("/api/v1/categories", headers=h(viewer, org), json={"name": "X"})
    assert res.status_code == 403
