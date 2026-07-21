from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import CurrentMembership, require_permission
from app.core.container import Provide
from app.core.pagination import CursorPage
from app.core.responses import EnvelopeRoute
from app.modules.documents.enums import DocumentType
from app.modules.documents.schemas import (
    DocumentCreate,
    DocumentListItem,
    DocumentListQuery,
    DocumentRead,
    DocumentUpdate,
    SellableItemRead,
    TaxRateCreate,
    TaxRateRead,
)
from app.modules.documents.service import DocumentService
from app.modules.orgs.models import Membership

router = APIRouter(tags=["documents"], route_class=EnvelopeRoute)
Svc = Depends(Provide(DocumentService))


@router.get("/tax-rates", response_model=list[TaxRateRead])
def list_tax_rates(membership: CurrentMembership, svc: DocumentService = Svc):
    return svc.list_tax_rates(membership.org_id)


@router.post("/tax-rates", response_model=TaxRateRead, status_code=status.HTTP_201_CREATED)
def create_tax_rate(
    payload: TaxRateCreate,
    membership: Membership = Depends(require_permission("orgs:update")),
    svc: DocumentService = Svc,
):
    return svc.create_tax_rate(membership.org_id, payload)


@router.get("/sellable-items", response_model=list[SellableItemRead])
def sellable_items(
    membership: CurrentMembership,
    search: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    svc: DocumentService = Svc,
):
    return svc.sellable_items(membership.org_id, search, limit)


def register_document_routes(path: str, doc_type: DocumentType, module: str) -> None:
    read = Depends(require_permission(f"{module}:read"))
    make = Depends(require_permission(f"{module}:create"))
    edit = Depends(require_permission(f"{module}:update"))
    drop = Depends(require_permission(f"{module}:delete"))

    @router.get(f"/{path}", response_model=CursorPage[DocumentListItem], name=f"list_{path}")
    def _list(
        query: Annotated[DocumentListQuery, Query()],
        membership: Membership = read,
        svc: DocumentService = Svc,
    ):
        items, next_cursor, has_more = svc.list_documents(membership.org_id, doc_type, query)
        return {"items": items, "next_cursor": next_cursor, "has_more": has_more}

    @router.post(
        f"/{path}",
        response_model=DocumentRead,
        status_code=status.HTTP_201_CREATED,
        name=f"create_{path}",
    )
    def _create(
        payload: DocumentCreate, membership: Membership = make, svc: DocumentService = Svc
    ):
        return svc.create(membership.org_id, doc_type, payload)

    @router.get(f"/{path}/{{doc_id}}", response_model=DocumentRead, name=f"get_{path}")
    def _get(doc_id: int, membership: Membership = read, svc: DocumentService = Svc):
        return svc.get_of_type(membership.org_id, doc_id, doc_type)

    @router.patch(f"/{path}/{{doc_id}}", response_model=DocumentRead, name=f"update_{path}")
    def _update(
        doc_id: int,
        payload: DocumentUpdate,
        membership: Membership = edit,
        svc: DocumentService = Svc,
    ):
        return svc.update(membership.org_id, doc_id, doc_type, payload)

    @router.post(
        f"/{path}/{{doc_id}}/finalize", response_model=DocumentRead, name=f"finalize_{path}"
    )
    def _finalize(doc_id: int, membership: Membership = edit, svc: DocumentService = Svc):
        return svc.finalize(membership.org_id, doc_id, doc_type)

    @router.post(f"/{path}/{{doc_id}}/void", response_model=DocumentRead, name=f"void_{path}")
    def _void(doc_id: int, membership: Membership = edit, svc: DocumentService = Svc):
        return svc.void(membership.org_id, doc_id, doc_type)

    @router.delete(
        f"/{path}/{{doc_id}}", status_code=status.HTTP_204_NO_CONTENT, name=f"delete_{path}"
    )
    def _delete(doc_id: int, membership: Membership = drop, svc: DocumentService = Svc) -> None:
        svc.delete(membership.org_id, doc_id, doc_type)


register_document_routes("invoices", DocumentType.INVOICE, "invoices")
register_document_routes("bills", DocumentType.BILL, "bills")
