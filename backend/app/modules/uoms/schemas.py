from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UomCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    symbol: str = Field(min_length=1, max_length=20)


class UomUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    symbol: str | None = Field(default=None, min_length=1, max_length=20)


class UomRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    symbol: str
    created_at: datetime


class UomSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    symbol: str
