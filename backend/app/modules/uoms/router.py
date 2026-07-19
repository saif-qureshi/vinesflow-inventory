from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.api.deps import require_permission
from app.core.container import Provide
from app.core.responses import EnvelopeRoute
from app.modules.orgs.models import Membership
from app.modules.uoms.models import Uom
from app.modules.uoms.schemas import UomCreate, UomRead, UomUpdate
from app.modules.uoms.service import UomService

router = APIRouter(prefix="/uoms", tags=["uoms"], route_class=EnvelopeRoute)
Svc = Depends(Provide(UomService))


@router.get("", response_model=list[UomRead])
def list_uoms(
    membership: Membership = Depends(require_permission("products:read")),
    svc: UomService = Svc,
) -> list[Uom]:
    return svc.list(membership.org_id)


@router.post("", response_model=UomRead, status_code=status.HTTP_201_CREATED)
def create_uom(
    payload: UomCreate,
    membership: Membership = Depends(require_permission("products:create")),
    svc: UomService = Svc,
) -> Uom:
    return svc.create(membership.org_id, payload)


@router.patch("/{uom_id}", response_model=UomRead)
def update_uom(
    uom_id: int,
    payload: UomUpdate,
    membership: Membership = Depends(require_permission("products:update")),
    svc: UomService = Svc,
) -> Uom:
    return svc.update(membership.org_id, uom_id, payload)


@router.delete("/{uom_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_uom(
    uom_id: int,
    membership: Membership = Depends(require_permission("products:delete")),
    svc: UomService = Svc,
) -> None:
    svc.delete(membership.org_id, uom_id)
