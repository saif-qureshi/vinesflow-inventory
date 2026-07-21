from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import require_permission
from app.core.container import Provide
from app.core.pagination import CursorPage
from app.core.responses import EnvelopeRoute
from app.modules.documents.schemas import (
    InvoiceCreate,
    InvoiceListItem,
    InvoiceListQuery,
    InvoiceRead,
    InvoiceUpdate,
    SellableItemRead,
    TaxRateCreate,
    TaxRateRead,
)
from app.modules.documents.service import DocumentService
from app.modules.orgs.models import Membership

router = APIRouter(tags=["documents"], route_class=EnvelopeRoute)
Svc = Depends(Provide(DocumentService))


@router.get("/tax-rates", response_model=list[TaxRateRead])
def list_tax_rates(
    membership: Membership = Depends(require_permission("invoices:read")),
    svc: DocumentService = Svc,
):
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
    search: str | None = None,
    membership: Membership = Depends(require_permission("invoices:read")),
    svc: DocumentService = Svc,
):
    return svc.sellable_items(membership.org_id, search, 20)


@router.get("/invoices", response_model=CursorPage[InvoiceListItem])
def list_invoices(
    query: Annotated[InvoiceListQuery, Query()],
    membership: Membership = Depends(require_permission("invoices:read")),
    svc: DocumentService = Svc,
):
    items, next_cursor, has_more = svc.list_invoices(membership.org_id, query)
    return {"items": items, "next_cursor": next_cursor, "has_more": has_more}


@router.post("/invoices", response_model=InvoiceRead, status_code=status.HTTP_201_CREATED)
def create_invoice(
    payload: InvoiceCreate,
    membership: Membership = Depends(require_permission("invoices:create")),
    svc: DocumentService = Svc,
):
    return svc.create_invoice(membership.org_id, payload)


@router.get("/invoices/{doc_id}", response_model=InvoiceRead)
def get_invoice(
    doc_id: int,
    membership: Membership = Depends(require_permission("invoices:read")),
    svc: DocumentService = Svc,
):
    return svc.get_invoice(membership.org_id, doc_id)


@router.patch("/invoices/{doc_id}", response_model=InvoiceRead)
def update_invoice(
    doc_id: int,
    payload: InvoiceUpdate,
    membership: Membership = Depends(require_permission("invoices:update")),
    svc: DocumentService = Svc,
):
    return svc.update_invoice(membership.org_id, doc_id, payload)


@router.post("/invoices/{doc_id}/finalize", response_model=InvoiceRead)
def finalize_invoice(
    doc_id: int,
    membership: Membership = Depends(require_permission("invoices:update")),
    svc: DocumentService = Svc,
):
    return svc.finalize(membership.org_id, doc_id)


@router.post("/invoices/{doc_id}/void", response_model=InvoiceRead)
def void_invoice(
    doc_id: int,
    membership: Membership = Depends(require_permission("invoices:update")),
    svc: DocumentService = Svc,
):
    return svc.void(membership.org_id, doc_id)


@router.delete("/invoices/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(
    doc_id: int,
    membership: Membership = Depends(require_permission("invoices:delete")),
    svc: DocumentService = Svc,
) -> None:
    svc.delete(membership.org_id, doc_id)
