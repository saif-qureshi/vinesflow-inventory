from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.core.pagination import ListQuery


class PaymentAllocationInput(BaseModel):
    document_id: int
    amount: Decimal = Field(gt=0)


class PaymentCreate(BaseModel):
    party_id: int
    document_date: date | None = None
    posting_date: date | None = None
    method: Literal["cash", "bank", "cheque", "card", "other"] = "cash"
    amount: Decimal = Field(gt=0)
    reference: str | None = Field(default=None, max_length=100)
    notes: str | None = None
    allocations: list[PaymentAllocationInput] = Field(default_factory=list)


class PaymentUpdate(BaseModel):
    party_id: int | None = None
    document_date: date | None = None
    posting_date: date | None = None
    method: Literal["cash", "bank", "cheque", "card", "other"] | None = None
    amount: Decimal | None = Field(default=None, gt=0)
    reference: str | None = None
    notes: str | None = None
    allocations: list[PaymentAllocationInput] | None = None


class PartySummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str | None = None


class PaymentAllocationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: int
    document_number: str
    amount: Decimal


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    direction: str
    number: str
    status: str
    party_id: int | None = None
    party: PartySummary | None = None
    party_name: str | None = None
    document_date: date
    posting_date: date
    method: str
    amount: Decimal
    allocated_amount: Decimal
    unapplied_amount: Decimal
    reference: str | None = None
    notes: str | None = None
    submitted_at: datetime | None = None
    cancelled_at: datetime | None = None
    created_at: datetime
    allocations: list[PaymentAllocationRead]


class PaymentListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    number: str
    status: str
    party_name: str | None = None
    document_date: date
    method: str
    amount: Decimal
    allocated_amount: Decimal
    unapplied_amount: Decimal


class PaymentListQuery(ListQuery):
    status: str | None = None
    party_id: int | None = None


class OutstandingDocumentRead(BaseModel):
    id: int
    number: str
    type: str
    issue_date: date
    due_date: date | None = None
    total: Decimal
    amount_paid: Decimal
    balance_due: Decimal
