from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class FbrReferenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    description: str | None = None
    value: Decimal | None = None
    parent_code: str | None = None


class FbrOption(BaseModel):
    value: str
    label: str


class FbrSyncSummary(BaseModel):
    counts: dict[str, int]
