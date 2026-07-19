from __future__ import annotations

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.modules.locations.models import Location
from app.modules.locations.schemas import LocationCreate, LocationUpdate

_ADDRESS = {"address"}


class LocationService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def seed_default(self, org_id: int) -> Location:
        existing = self.db.scalar(select(Location).where(Location.org_id == org_id).limit(1))
        if existing:
            return existing
        location = Location(org_id=org_id, name="Main Warehouse", is_default=True)
        self.db.add(location)
        self.db.flush()
        return location

    def list(self, org_id: int) -> list[Location]:
        return list(
            self.db.scalars(
                select(Location)
                .where(Location.org_id == org_id)
                .order_by(Location.is_default.desc(), Location.name)
            )
        )

    def get(self, org_id: int, location_id: int) -> Location:
        location = self.db.scalar(
            select(Location).where(Location.id == location_id, Location.org_id == org_id)
        )
        if location is None:
            raise NotFoundError("Location not found")
        return location

    def _clear_defaults(self, org_id: int, keep_id: int | None = None) -> None:
        stmt = update(Location).where(Location.org_id == org_id, Location.is_default.is_(True))
        if keep_id is not None:
            stmt = stmt.where(Location.id != keep_id)
        self.db.execute(stmt.values(is_default=False))

    def create(self, org_id: int, payload: LocationCreate) -> Location:
        data = payload.model_dump(exclude=_ADDRESS)
        location = Location(
            org_id=org_id,
            address=payload.address.model_dump() if payload.address else None,
            **data,
        )
        self.db.add(location)
        self.db.flush()
        if location.is_default:
            self._clear_defaults(org_id, keep_id=location.id)
        self.db.commit()
        self.db.refresh(location)
        return location

    def update(self, org_id: int, location_id: int, payload: LocationUpdate) -> Location:
        location = self.get(org_id, location_id)
        fields = payload.model_fields_set
        for key, value in payload.model_dump(exclude=_ADDRESS, exclude_unset=True).items():
            setattr(location, key, value)
        if "address" in fields:
            location.address = payload.address.model_dump() if payload.address else None
        if location.is_default:
            self._clear_defaults(org_id, keep_id=location.id)
        self.db.commit()
        self.db.refresh(location)
        return location

    def delete(self, org_id: int, location_id: int) -> None:
        from app.modules.inventory.models import StockMovement

        location = self.get(org_id, location_id)
        if location.is_default:
            raise ConflictError("Cannot delete the default location")
        has_stock = self.db.scalar(
            select(StockMovement.id).where(StockMovement.location_id == location_id).limit(1)
        )
        if has_stock:
            raise ConflictError("Location has stock history; deactivate it instead")
        self.db.delete(location)
        self.db.commit()
