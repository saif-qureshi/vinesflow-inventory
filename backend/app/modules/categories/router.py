from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.api.deps import require_permission
from app.core.container import Provide
from app.core.responses import EnvelopeRoute
from app.modules.categories.models import Category
from app.modules.categories.schemas import CategoryCreate, CategoryRead, CategoryUpdate
from app.modules.categories.service import CategoryService
from app.modules.orgs.models import Membership

router = APIRouter(prefix="/categories", tags=["categories"], route_class=EnvelopeRoute)
Svc = Depends(Provide(CategoryService))


@router.get("", response_model=list[CategoryRead])
def list_categories(
    membership: Membership = Depends(require_permission("products:read")),
    svc: CategoryService = Svc,
) -> list[Category]:
    return svc.list(membership.org_id)


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    membership: Membership = Depends(require_permission("products:create")),
    svc: CategoryService = Svc,
) -> Category:
    return svc.create(membership.org_id, payload)


@router.patch("/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    membership: Membership = Depends(require_permission("products:update")),
    svc: CategoryService = Svc,
) -> Category:
    return svc.update(membership.org_id, category_id, payload)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    membership: Membership = Depends(require_permission("products:delete")),
    svc: CategoryService = Svc,
) -> None:
    svc.delete(membership.org_id, category_id)
