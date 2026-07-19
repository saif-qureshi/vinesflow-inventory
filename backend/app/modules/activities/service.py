from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.pagination import paginate_cursor
from app.modules.activities.models import Activity
from app.modules.activities.schemas import ActivityListQuery


class ActivityService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def record(
        self,
        org_id: int,
        action: str,
        entity_type: str,
        summary: str,
        *,
        entity_id: int | None = None,
        context: dict | None = None,
        actor_id: int | None = None,
    ) -> None:
        """Log an activity in the caller's transaction (no commit).

        Actor defaults to the request's current user, stashed on the session by
        the auth dependency, so services need not thread it through. `action` and
        `entity_type` are free-form (e.g. "submitted"/"invoice", "adjusted"/"stock");
        `context` carries structured extras (amount, status, counterparty).
        """
        if actor_id is None:
            actor_id = self.db.info.get("actor_id")
        self.db.add(
            Activity(
                org_id=org_id,
                actor_id=actor_id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                summary=summary[:255],
                context=context,
            )
        )

    def list(self, org_id: int, query: ActivityListQuery) -> tuple[list[Activity], str | None, bool]:
        stmt = select(Activity).where(Activity.org_id == org_id)
        if query.entity_type:
            stmt = stmt.where(Activity.entity_type == query.entity_type)
        if query.entity_id is not None:
            stmt = stmt.where(Activity.entity_id == query.entity_id)
        if query.search:
            stmt = stmt.where(Activity.summary.ilike(f"%{query.search.strip()}%"))
        return paginate_cursor(self.db, stmt, Activity.id, query)
