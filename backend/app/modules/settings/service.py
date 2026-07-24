from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.modules.settings.models import Setting


class SettingsService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, org_id: int, group: str, key: str, fallback: Any = None) -> Any:
        row = self.db.scalar(
            select(Setting).where(
                Setting.org_id == org_id, Setting.group == group, Setting.key == key
            )
        )
        return row.value if row is not None else fallback

    def get_group(self, org_id: int, group: str) -> dict[str, Any]:
        rows = self.db.scalars(
            select(Setting).where(Setting.org_id == org_id, Setting.group == group)
        )
        return {row.key: row.value for row in rows}

    def set(self, org_id: int, group: str, key: str, value: Any) -> None:
        stmt = pg_insert(Setting).values(org_id=org_id, group=group, key=key, value=value)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_setting_org_group_key", set_={"value": stmt.excluded.value}
        )
        self.db.execute(stmt)

    def seed_numbering(self, org_id: int) -> None:
        from app.modules.documents.enums import DEFAULT_PREFIXES, PAYMENT_PREFIXES

        existing = set(self.get_group(org_id, "numbering"))
        for doc_type, prefix in DEFAULT_PREFIXES.items():
            if str(doc_type) not in existing:
                self.set(org_id, "numbering", str(doc_type), {"prefix": prefix, "padding": 4})
        for direction, prefix in PAYMENT_PREFIXES.items():
            key = f"payment_{direction}"
            if key not in existing:
                self.set(org_id, "numbering", key, {"prefix": prefix, "padding": 4})
        self.db.flush()
