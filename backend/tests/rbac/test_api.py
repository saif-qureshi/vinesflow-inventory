def test_default_roles_seeded_per_org(client, register, org_id_of, h):
    token = register()
    org_id = org_id_of(token)
    roles = client.get("/api/v1/roles", headers=h(token, org_id)).json()["data"]
    assert {"super_admin", "admin", "member", "viewer"} <= {r["slug"] for r in roles}


def test_permission_catalog_listed(client, register, org_id_of, h):
    token = register()
    org_id = org_id_of(token)
    perms = client.get("/api/v1/permissions", headers=h(token, org_id)).json()["data"]
    codes = {p["code"] for p in perms}
    assert {"invoices:create", "roles:delete", "orgs:update"} <= codes


def test_create_and_delete_custom_role(client, register, org_id_of, h):
    token = register()
    org_id = org_id_of(token)
    created = client.post(
        "/api/v1/roles",
        headers=h(token, org_id),
        json={"name": "Billing Clerk", "permissions": ["invoices:read", "invoices:create"]},
    )
    assert created.status_code == 201
    role = created.json()["data"]
    assert role["is_system"] is False
    assert {p["code"] for p in role["permissions"]} == {"invoices:read", "invoices:create"}
    assert client.delete(f"/api/v1/roles/{role['id']}", headers=h(token, org_id)).status_code == 204


def test_system_roles_cannot_be_deleted(client, register, org_id_of, h):
    token = register()
    org_id = org_id_of(token)
    admin_role = next(
        r for r in client.get("/api/v1/roles", headers=h(token, org_id)).json()["data"]
        if r["slug"] == "admin"
    )
    res = client.delete(f"/api/v1/roles/{admin_role['id']}", headers=h(token, org_id))
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "bad_request"


def test_missing_org_header_rejected(client, register, h):
    token = register()
    assert client.get("/api/v1/roles", headers=h(token)).status_code == 400


def test_viewer_cannot_create_role(client, register, org_id_of, h):
    owner = register(email="owner@test.io", org="Acme")
    org_id = org_id_of(owner)
    viewer_token = register(email="viewer@test.io", org="Personal")

    viewer_role = next(
        r for r in client.get("/api/v1/roles", headers=h(owner, org_id)).json()["data"]
        if r["slug"] == "viewer"
    )
    assert client.post(
        "/api/v1/orgs/current/members",
        headers=h(owner, org_id),
        json={"email": "viewer@test.io", "role_id": viewer_role["id"]},
    ).status_code == 201

    # The viewer is a member of Acme but lacks roles:create.
    res = client.post(
        "/api/v1/roles",
        headers=h(viewer_token, org_id),
        json={"name": "Nope", "permissions": []},
    )
    assert res.status_code == 403
