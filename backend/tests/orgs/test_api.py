def test_list_and_create_orgs(client, register, h):
    token = register()
    assert len(client.get("/api/v1/orgs", headers=h(token)).json()["data"]) == 1

    created = client.post("/api/v1/orgs", headers=h(token), json={"name": "Second Co", "currency": "USD"})
    assert created.status_code == 201
    assert created.json()["data"]["currency"] == "USD"
    assert len(client.get("/api/v1/orgs", headers=h(token)).json()["data"]) == 2


def test_update_org_branding(client, register, org_id_of, h):
    token = register()
    org_id = org_id_of(token)
    res = client.patch(
        "/api/v1/orgs/current",
        headers=h(token, org_id),
        json={"currency": "eur", "accent_color": "#e11d48", "theme": "dark"},
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["currency"] == "EUR"
    assert data["accent_color"] == "#e11d48"
    assert data["theme"] == "dark"


def test_owner_has_all_permissions(client, register, org_id_of, h):
    token = register()
    org_id = org_id_of(token)
    perms = client.get("/api/v1/orgs/current/my-permissions", headers=h(token, org_id)).json()["data"]
    assert "orgs:delete" in perms and "roles:create" in perms


def test_member_lifecycle(client, register, org_id_of, h):
    owner = register(email="owner@test.io", org="Acme")
    org_id = org_id_of(owner)
    register(email="member@test.io", org="Personal")  # user must exist first

    member_role = next(
        r for r in client.get("/api/v1/roles", headers=h(owner, org_id)).json()["data"]
        if r["slug"] == "member"
    )
    added = client.post(
        "/api/v1/orgs/current/members",
        headers=h(owner, org_id),
        json={"email": "member@test.io", "role_id": member_role["id"]},
    )
    assert added.status_code == 201
    membership_id = added.json()["data"]["id"]

    # Adding the same user again conflicts.
    dup = client.post(
        "/api/v1/orgs/current/members",
        headers=h(owner, org_id),
        json={"email": "member@test.io", "role_id": member_role["id"]},
    )
    assert dup.status_code == 409

    assert client.delete(f"/api/v1/orgs/current/members/{membership_id}", headers=h(owner, org_id)).status_code == 204


def test_add_unknown_user_returns_not_found(client, register, org_id_of, h):
    owner = register()
    org_id = org_id_of(owner)
    role = client.get("/api/v1/roles", headers=h(owner, org_id)).json()["data"][0]
    res = client.post(
        "/api/v1/orgs/current/members",
        headers=h(owner, org_id),
        json={"email": "ghost@test.io", "role_id": role["id"]},
    )
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "not_found"
