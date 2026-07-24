from __future__ import annotations

from pydantic import BaseModel, Field


class NumberingEntry(BaseModel):
    key: str
    label: str
    prefix: str
    start: str
    restart: str


class NumberingEntryUpdate(BaseModel):
    key: str
    prefix: str = Field(min_length=1, max_length=12, pattern=r"^[A-Za-z0-9/-]+$")
    start: str = Field(pattern=r"^\d{1,10}$")
    restart: str = Field(default="none", pattern="^(none|yearly)$")


class NumberingUpdate(BaseModel):
    entries: list[NumberingEntryUpdate]
