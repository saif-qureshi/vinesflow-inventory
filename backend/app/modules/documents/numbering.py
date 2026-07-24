from __future__ import annotations

from sqlalchemy import ColumnElement, Integer, cast, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import InstrumentedAttribute, Session

from app.core.exceptions import ConflictError
from app.modules.settings.service import SettingsService

_MAX_RETRIES = 6


def numbering_format(db: Session, org_id: int, key: str, default_prefix: str) -> tuple[str, int]:
    fmt = SettingsService(db).get(org_id, "numbering", key)
    if isinstance(fmt, dict):
        return str(fmt.get("prefix") or default_prefix), int(fmt.get("padding") or 4)
    return default_prefix, 4


def _peak(db: Session, number_col: InstrumentedAttribute, *where: ColumnElement) -> int:
    value = db.scalar(
        select(func.coalesce(func.max(cast(func.substring(number_col, "[0-9]+$"), Integer)), 0)).where(
            *where
        )
    )
    return int(value or 0)


def assign_number(
    db: Session, entity, number_col: InstrumentedAttribute, prefix: str, padding: int, *where: ColumnElement
) -> None:
    entity.number = f"{prefix}-{_peak(db, number_col, *where) + 1:0{padding}d}"
    db.add(entity)
    for _ in range(_MAX_RETRIES):
        savepoint = db.begin_nested()
        try:
            db.flush()
            savepoint.commit()
            return
        except IntegrityError:
            savepoint.rollback()
            entity.number = f"{prefix}-{_peak(db, number_col, *where) + 1:0{padding}d}"
    raise ConflictError("Could not assign a document number")
