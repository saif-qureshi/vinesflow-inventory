from __future__ import annotations

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import AuditMixin, Base, TimestampMixin


class Attribute(Base, TimestampMixin, AuditMixin):
    """Org-level reusable variant attribute, e.g. Color or Size."""

    __tablename__ = "attributes"
    __table_args__ = (UniqueConstraint("org_id", "name", name="uq_attribute_org_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    values: Mapped[list[AttributeValue]] = relationship(
        back_populates="attribute",
        cascade="all, delete-orphan",
        order_by="AttributeValue.id",
        lazy="selectin",
    )


class AttributeValue(Base, TimestampMixin, AuditMixin):
    """A value of an attribute, e.g. Red / Blue for Color."""

    __tablename__ = "attribute_values"
    __table_args__ = (UniqueConstraint("attribute_id", "value", name="uq_attrvalue_attr_value"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    attribute_id: Mapped[int] = mapped_column(
        ForeignKey("attributes.id", ondelete="CASCADE"), index=True, nullable=False
    )
    value: Mapped[str] = mapped_column(String(100), nullable=False)

    attribute: Mapped[Attribute] = relationship(back_populates="values", lazy="selectin")

    @property
    def attribute_name(self) -> str:
        return self.attribute.name
