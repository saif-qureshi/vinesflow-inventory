from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.modules.categories.models import Category
from app.modules.categories.schemas import CategoryCreate, CategoryUpdate


class CategoryService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list(self, org_id: int) -> list[Category]:
        return list(
            self.db.scalars(
                select(Category).where(Category.org_id == org_id).order_by(Category.name)
            ).all()
        )

    def get(self, org_id: int, category_id: int) -> Category:
        category = self.db.scalar(
            select(Category).where(Category.id == category_id, Category.org_id == org_id)
        )
        if category is None:
            raise NotFoundError("Category not found")
        return category

    def _ensure_unique_name(self, org_id: int, name: str, exclude_id: int | None = None) -> None:
        q = select(Category.id).where(Category.org_id == org_id, Category.name == name)
        if exclude_id is not None:
            q = q.where(Category.id != exclude_id)
        if self.db.scalar(q) is not None:
            raise ConflictError("A category with that name already exists")

    def create(self, org_id: int, payload: CategoryCreate) -> Category:
        self._ensure_unique_name(org_id, payload.name)
        if payload.parent_id is not None:
            self.get(org_id, payload.parent_id)
        category = Category(org_id=org_id, name=payload.name, parent_id=payload.parent_id)
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        return category

    def update(self, org_id: int, category_id: int, payload: CategoryUpdate) -> Category:
        category = self.get(org_id, category_id)
        if payload.name is not None:
            self._ensure_unique_name(org_id, payload.name, exclude_id=category_id)
            category.name = payload.name
        if payload.parent_id is not None:
            if payload.parent_id == category_id:
                raise ConflictError("A category cannot be its own parent")
            self.get(org_id, payload.parent_id)
            category.parent_id = payload.parent_id
        self.db.commit()
        self.db.refresh(category)
        return category

    def delete(self, org_id: int, category_id: int) -> None:
        self.db.delete(self.get(org_id, category_id))
        self.db.commit()
