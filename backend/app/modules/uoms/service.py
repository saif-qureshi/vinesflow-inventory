from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.modules.uoms.models import Uom
from app.modules.uoms.schemas import UomCreate, UomUpdate

DEFAULT_UOMS: list[tuple[str, str]] = [
    ("Piece", "pc"),
    ("Box", "box"),
    ("Pack", "pack"),
    ("Dozen", "dz"),
    ("Pair", "pr"),
    ("Set", "set"),
    ("Unit", "unit"),
    ("Kilogram", "kg"),
    ("Gram", "g"),
    ("Liter", "L"),
    ("Milliliter", "mL"),
    ("Meter", "m"),
    ("Centimeter", "cm"),
    ("Hour", "hr"),
]


class UomService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def seed_defaults(self, org_id: int) -> None:
        existing = set(self.db.scalars(select(Uom.name).where(Uom.org_id == org_id)))
        self.db.add_all(
            Uom(org_id=org_id, name=name, symbol=symbol)
            for name, symbol in DEFAULT_UOMS
            if name not in existing
        )
        self.db.flush()

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
