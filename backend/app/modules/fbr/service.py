from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.modules.fbr.enums import FbrProvince
from app.modules.fbr.models import FbrReferenceData
from app.modules.fbr.schemas import FbrOption


class FbrService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def provinces(self) -> list[FbrOption]:
        return [FbrOption(value=p.value, label=p.value.title()) for p in FbrProvince]

    def reference(
        self, ref_type: str, parent: str | None, search: str | None, limit: int
    ) -> list[FbrReferenceData]:
        stmt = select(FbrReferenceData).where(
            FbrReferenceData.type == ref_type, FbrReferenceData.is_active.is_(True)
        )
        if parent is not None:
            stmt = stmt.where(FbrReferenceData.parent_code == parent)
        if search:
            like = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(FbrReferenceData.code.ilike(like), FbrReferenceData.description.ilike(like))
            )
        return list(self.db.scalars(stmt.order_by(FbrReferenceData.code).limit(limit)))

    def summary(self) -> dict[str, int]:
        rows = self.db.execute(
            select(FbrReferenceData.type, func.count()).group_by(FbrReferenceData.type)
        ).all()
        return {ref_type: count for ref_type, count in rows}
