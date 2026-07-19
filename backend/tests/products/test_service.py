import pytest

from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password
from app.modules.categories.schemas import CategoryCreate
from app.modules.categories.service import CategoryService
from app.modules.media.models import MediaAsset
from app.modules.media.service import MediaService
from app.modules.orgs.service import OrgService
from app.modules.products.models import PRODUCT_MEDIA_TYPE
from app.modules.products.schemas import ProductCreate
from app.modules.products.service import ProductService
from app.modules.users.models import User


def _org(db) -> int:
    user = User(email="o@test.io", hashed_password=hash_password("password123"))
    db.add(user)
    db.flush()
    org = OrgService(db).create_org_with_owner(owner=user, name="Acme")
    db.flush()
    return org.id


def test_create_product_persists_media(db):
    org_id = _org(db)
    product = ProductService(db).create(
        org_id,
        ProductCreate(name="Item", media=[{"url": "https://cdn/a.png"}, {"url": "https://cdn/b.png"}]),
    )
    media = MediaService(db).list_for(PRODUCT_MEDIA_TYPE, product.id)
    assert [m.url for m in media] == ["https://cdn/a.png", "https://cdn/b.png"]


def test_sku_uniqueness_enforced(db):
    org_id = _org(db)
    svc = ProductService(db)
    svc.create(org_id, ProductCreate(name="A", sku="X1"))
    with pytest.raises(ConflictError):
        svc.create(org_id, ProductCreate(name="B", sku="X1"))


def test_invalid_category_ref_raises_not_found(db):
    org_id = _org(db)
    with pytest.raises(NotFoundError):
        ProductService(db).create(org_id, ProductCreate(name="A", category_id=4242))


def test_delete_removes_media(db):
    org_id = _org(db)
    svc = ProductService(db)
    product = svc.create(org_id, ProductCreate(name="A", media=[{"url": "https://cdn/a.png"}]))
    pid = product.id
    svc.delete(org_id, pid)
    assert db.query(MediaAsset).filter_by(attachable_type=PRODUCT_MEDIA_TYPE, attachable_id=pid).count() == 0


def test_variant_attributes_are_reused_org_wide(db):
    from app.modules.attributes.models import Attribute
    from app.modules.products.schemas import VariantAttributeInput, VariantInput

    org_id = _org(db)
    svc = ProductService(db)
    svc.create(
        org_id,
        ProductCreate(
            name="A",
            type="variable",
            variant_attributes=[VariantAttributeInput(name="Color", options=["Red"])],
            variants=[VariantInput(options={"Color": "Red"})],
        ),
    )
    svc.create(
        org_id,
        ProductCreate(
            name="B",
            type="variable",
            variant_attributes=[VariantAttributeInput(name="Color", options=["Red", "Green"])],
            variants=[VariantInput(options={"Color": "Green"})],
        ),
    )
    colors = db.query(Attribute).filter_by(org_id=org_id, name="Color").all()
    assert len(colors) == 1


def test_valid_category_link(db):
    org_id = _org(db)
    category = CategoryService(db).create(org_id, CategoryCreate(name="Cat"))
    product = ProductService(db).create(org_id, ProductCreate(name="A", category_id=category.id))
    assert product.category.name == "Cat"
