from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.core.pagination import ListQuery


class ActivityListQuery(ListQuery):
    entity_type: str | None = None


class ActorSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str | None = None
    email: str
    avatar_url: str | None = None


class ActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    action: str
    entity_type: str
    entity_id: int | None = None
    summary: str
    context: dict | None = None
    actor: ActorSummary | None = None
    created_at: datetime
