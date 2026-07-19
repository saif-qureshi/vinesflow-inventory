from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.modules.uoms.models import Uom
from app.modules.uoms.schemas import UomCreate, UomUpdate


class UomService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list(self, org_id: int) -> list[Uom]:
        return list(self.db.scalars(select(Uom).where(Uom.org_id == org_id).order_by(Uom.name)).all())

    def get(self, org_id: int, uom_id: int) -> Uom:
        uom = self.db.scalar(select(Uom).where(Uom.id == uom_id, Uom.org_id == org_id))
        if uom is None:
            raise NotFoundError("Unit not found")
        return uom

    def create(self, org_id: int, payload: UomCreate) -> Uom:
        if self.db.scalar(select(Uom.id).where(Uom.org_id == org_id, Uom.name == payload.name)):
            raise ConflictError("A unit with that name already exists")
        uom = Uom(org_id=org_id, name=payload.name, symbol=payload.symbol)
        self.db.add(uom)
        self.db.commit()
        self.db.refresh(uom)
        return uom

    def update(self, org_id: int, uom_id: int, payload: UomUpdate) -> Uom:
        uom = self.get(org_id, uom_id)
        if payload.name is not None:
            uom.name = payload.name
        if payload.symbol is not None:
            uom.symbol = payload.symbol
        self.db.commit()
        self.db.refresh(uom)
        return uom

    def delete(self, org_id: int, uom_id: int) -> None:
        self.db.delete(self.get(org_id, uom_id))
        self.db.commit()
