from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.api.deps import require_permission
from app.core.container import Provide
from app.core.responses import EnvelopeRoute
from app.modules.locations.models import Location
from app.modules.locations.schemas import LocationCreate, LocationRead, LocationUpdate
from app.modules.locations.service import LocationService
from app.modules.orgs.models import Membership

router = APIRouter(prefix="/locations", tags=["locations"], route_class=EnvelopeRoute)
Svc = Depends(Provide(LocationService))


@router.get("", response_model=list[LocationRead])
def list_locations(
    membership: Membership = Depends(require_permission("inventory:read")),
    svc: LocationService = Svc,
) -> list[Location]:
    return svc.list(membership.org_id)


@router.post("", response_model=LocationRead, status_code=status.HTTP_201_CREATED)
def create_location(
    payload: LocationCreate,
    membership: Membership = Depends(require_permission("inventory:create")),
    svc: LocationService = Svc,
) -> Location:
    return svc.create(membership.org_id, payload)


@router.patch("/{location_id}", response_model=LocationRead)
def update_location(
    location_id: int,
    payload: LocationUpdate,
    membership: Membership = Depends(require_permission("inventory:update")),
    svc: LocationService = Svc,
) -> Location:
    return svc.update(membership.org_id, location_id, payload)


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_location(
    location_id: int,
    membership: Membership = Depends(require_permission("inventory:delete")),
    svc: LocationService = Svc,
) -> None:
    svc.delete(membership.org_id, location_id)
