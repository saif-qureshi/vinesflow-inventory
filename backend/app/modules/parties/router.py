from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import require_permission
from app.core.container import Provide
from app.core.pagination import CursorPage
from app.core.responses import EnvelopeRoute
from app.modules.orgs.models import Membership
from app.modules.parties.models import Party
from app.modules.parties.schemas import PartyCreate, PartyListQuery, PartyRead, PartyUpdate
from app.modules.parties.service import PartyService

router = APIRouter(prefix="/parties", tags=["parties"], route_class=EnvelopeRoute)
Svc = Depends(Provide(PartyService))


@router.get("", response_model=CursorPage[PartyRead])
def list_parties(
    query: Annotated[PartyListQuery, Query()],
    membership: Membership = Depends(require_permission("parties:read")),
    svc: PartyService = Svc,
):
    items, next_cursor, has_more = svc.list(membership.org_id, query)
    return {"items": items, "next_cursor": next_cursor, "has_more": has_more}


@router.post("", response_model=PartyRead, status_code=status.HTTP_201_CREATED)
def create_party(
    payload: PartyCreate,
    membership: Membership = Depends(require_permission("parties:create")),
    svc: PartyService = Svc,
) -> Party:
    return svc.create(membership.org_id, payload)


@router.get("/{party_id}", response_model=PartyRead)
def get_party(
    party_id: int,
    membership: Membership = Depends(require_permission("parties:read")),
    svc: PartyService = Svc,
) -> Party:
    return svc.get(membership.org_id, party_id)


@router.patch("/{party_id}", response_model=PartyRead)
def update_party(
    party_id: int,
    payload: PartyUpdate,
    membership: Membership = Depends(require_permission("parties:update")),
    svc: PartyService = Svc,
) -> Party:
    return svc.update(membership.org_id, party_id, payload)


@router.delete("/{party_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_party(
    party_id: int,
    membership: Membership = Depends(require_permission("parties:delete")),
    svc: PartyService = Svc,
) -> None:
    svc.delete(membership.org_id, party_id)
