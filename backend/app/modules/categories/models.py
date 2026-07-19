from __future__ import annotations

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin


class Category(Base, TimestampMixin):
    """Org-scoped product category, optionally nested under a parent."""

    __tablename__ = "categories"
    __table_args__ = (UniqueConstraint("org_id", "name", name="uq_category_org_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )

    parent: Mapped[Category | None] = relationship(remote_side="Category.id")
