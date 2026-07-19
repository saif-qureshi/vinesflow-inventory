import pytest


@pytest.fixture()
def hdr(register, org_id_of, h):
    token = register()
    return h(token, org_id_of(token))


def _names(client, hdr, role):
    res = client.get(f"/api/v1/parties?role={role}", headers=hdr).json()["data"]["items"]
    return [p["name"] for p in res]


def test_create_and_role_filter(client, hdr):
    res = client.post(
        "/api/v1/parties",
        headers=hdr,
        json={
            "name": "Alice Co",
            "is_customer": True,
            "email": "alice@acme.test",
            "billing_address": {"line1": "1 Main St", "city": "Lahore"},
        },
    )
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["is_customer"] is True and data["is_vendor"] is False
    assert data["billing_address"]["city"] == "Lahore"
    assert "Alice Co" in _names(client, hdr, "customer")
    assert "Alice Co" not in _names(client, hdr, "vendor")


def test_create_requires_role(client, hdr):
    res = client.post("/api/v1/parties", headers=hdr, json={"name": "Nobody"})
    assert res.status_code == 400


def test_single_party_both_roles(client, hdr):
    client.post(
        "/api/v1/parties",
        headers=hdr,
        json={"name": "Acme", "is_customer": True, "is_vendor": True},
    )
    assert "Acme" in _names(client, hdr, "customer")
    assert "Acme" in _names(client, hdr, "vendor")


def test_enable_other_role_via_patch(client, hdr):
    pid = client.post(
        "/api/v1/parties", headers=hdr, json={"name": "Acme", "is_customer": True}
    ).json()["data"]["id"]
    upd = client.patch(f"/api/v1/parties/{pid}", headers=hdr, json={"is_vendor": True})
    assert upd.json()["data"]["is_vendor"] is True
    assert "Acme" in _names(client, hdr, "vendor")


def test_delete(client, hdr):
    pid = client.post(
        "/api/v1/parties", headers=hdr, json={"name": "Solo", "is_customer": True}
    ).json()["data"]["id"]
    assert client.delete(f"/api/v1/parties/{pid}", headers=hdr).status_code == 204
    assert client.get(f"/api/v1/parties/{pid}", headers=hdr).status_code == 404


def test_search_and_type_filter(client, hdr):
    client.post(
        "/api/v1/parties",
        headers=hdr,
        json={"name": "Blue Traders", "is_customer": True, "type": "business"},
    )
    client.post(
        "/api/v1/parties",
        headers=hdr,
        json={"name": "John Doe", "is_customer": True, "type": "individual"},
    )
    by_search = client.get("/api/v1/parties?search=blue", headers=hdr).json()["data"]["items"]
    assert [p["name"] for p in by_search] == ["Blue Traders"]
    individuals = client.get(
        "/api/v1/parties?type=individual", headers=hdr
    ).json()["data"]["items"]
    assert [p["name"] for p in individuals] == ["John Doe"]
