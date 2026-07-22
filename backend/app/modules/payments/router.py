from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import require_permission
from app.core.container import Provide
from app.core.pagination import CursorPage
from app.core.responses import EnvelopeRoute
from app.modules.documents.enums import PaymentDirection
from app.modules.orgs.models import Membership
from app.modules.payments.schemas import (
    OutstandingDocumentRead,
    PaymentCreate,
    PaymentListItem,
    PaymentListQuery,
    PaymentRead,
    PaymentUpdate,
)
from app.modules.payments.service import PaymentService

router = APIRouter(tags=["payments"], route_class=EnvelopeRoute)
Svc = Depends(Provide(PaymentService))


@router.get("/outstanding-documents", response_model=list[OutstandingDocumentRead])
def outstanding_documents(
    direction: PaymentDirection,
    party_id: int,
    membership: Membership = Depends(require_permission("payments:read")),
    svc: PaymentService = Svc,
):
    return svc.outstanding_documents(membership.org_id, direction, party_id)


def register_payment_routes(path: str, direction: PaymentDirection, module: str = "payments") -> None:
    read = Depends(require_permission(f"{module}:read"))
    make = Depends(require_permission(f"{module}:create"))
    edit = Depends(require_permission(f"{module}:update"))
    drop = Depends(require_permission(f"{module}:delete"))

    @router.get(f"/{path}", response_model=CursorPage[PaymentListItem], name=f"list_{path}")
    def _list(
        query: Annotated[PaymentListQuery, Query()],
        membership: Membership = read,
        svc: PaymentService = Svc,
    ):
        items, next_cursor, has_more = svc.list(membership.org_id, direction, query)
        return {"items": items, "next_cursor": next_cursor, "has_more": has_more}

    @router.post(
        f"/{path}", response_model=PaymentRead, status_code=status.HTTP_201_CREATED, name=f"create_{path}"
    )
    def _create(payload: PaymentCreate, membership: Membership = make, svc: PaymentService = Svc):
        return svc.create(membership.org_id, direction, payload)

    @router.get(f"/{path}/{{payment_id}}", response_model=PaymentRead, name=f"get_{path}")
    def _get(payment_id: int, membership: Membership = read, svc: PaymentService = Svc):
        return svc.get_of_direction(membership.org_id, payment_id, direction)

    @router.patch(f"/{path}/{{payment_id}}", response_model=PaymentRead, name=f"update_{path}")
    def _update(
        payment_id: int,
        payload: PaymentUpdate,
        membership: Membership = edit,
        svc: PaymentService = Svc,
    ):
        return svc.update(membership.org_id, direction, payment_id, payload)

    @router.post(f"/{path}/{{payment_id}}/submit", response_model=PaymentRead, name=f"submit_{path}")
    def _submit(payment_id: int, membership: Membership = edit, svc: PaymentService = Svc):
        return svc.submit(membership.org_id, direction, payment_id)

    @router.post(f"/{path}/{{payment_id}}/cancel", response_model=PaymentRead, name=f"cancel_{path}")
    def _cancel(payment_id: int, membership: Membership = edit, svc: PaymentService = Svc):
        return svc.cancel(membership.org_id, direction, payment_id)

    @router.delete(
        f"/{path}/{{payment_id}}", status_code=status.HTTP_204_NO_CONTENT, name=f"delete_{path}"
    )
    def _delete(payment_id: int, membership: Membership = drop, svc: PaymentService = Svc) -> None:
        svc.delete(membership.org_id, direction, payment_id)


register_payment_routes("payments-received", PaymentDirection.RECEIVED)
register_payment_routes("payments-made", PaymentDirection.MADE)
