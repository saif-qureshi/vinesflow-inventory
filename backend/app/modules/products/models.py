from __future__ import annotations

from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Column,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Table,
    Text,
    UniqueConstraint,
    and_,
)
from sqlalchemy.orm import Mapped, foreign, mapped_column, relationship

from app.db.base_class import AuditMixin, Base, TimestampMixin
from app.modules.attributes.models import AttributeValue
from app.modules.categories.models import Category
from app.modules.media.models import MediaAsset
from app.modules.uoms.models import Uom

PRODUCT_MEDIA_TYPE = "product"

# The attribute values a variable product is offered in.
product_attribute_values = Table(
    "product_attribute_values",
    Base.metadata,
    Column("product_id", ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
    Column("attribute_value_id", ForeignKey("attribute_values.id", ondelete="CASCADE"), primary_key=True),
)

# The specific value per attribute that a variant represents.
variant_values = Table(
    "variant_values",
    Base.metadata,
    Column("variant_id", ForeignKey("product_variants.id", ondelete="CASCADE"), primary_key=True),
    Column("attribute_value_id", ForeignKey("attribute_values.id", ondelete="CASCADE"), primary_key=True),
)


class Product(Base, TimestampMixin, AuditMixin):
    __tablename__ = "products"
    __table_args__ = (UniqueConstraint("org_id", "sku", name="uq_product_org_sku"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    nature: Mapped[str] = mapped_column(String(20), default="good", server_default="good", nullable=False)
    type: Mapped[str] = mapped_column(String(20), default="single", server_default="single", nullable=False)
    sku: Mapped[str | None] = mapped_column(String(100), nullable=True)
    barcode: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    sale_price: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    purchase_price: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)

    track_inventory: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )
    reorder_point: Mapped[int | None] = mapped_column(Integer, nullable=True)

    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    uom_id: Mapped[int | None] = mapped_column(
        ForeignKey("uoms.id", ondelete="SET NULL"), nullable=True
    )

    category: Mapped[Category | None] = relationship(lazy="selectin")
    uom: Mapped[Uom | None] = relationship(lazy="selectin")
    # For variable products: the attribute values this product is offered in.
    attribute_values: Mapped[list[AttributeValue]] = relationship(
        secondary=product_attribute_values, lazy="selectin"
    )
    variants: Mapped[list[ProductVariant]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductVariant.sort_order",
        lazy="selectin",
    )
    media: Mapped[list[MediaAsset]] = relationship(
        primaryjoin=lambda: and_(
            foreign(MediaAsset.attachable_id) == Product.id,
            MediaAsset.attachable_type == PRODUCT_MEDIA_TYPE,
        ),
        order_by=lambda: MediaAsset.sort_order,
        viewonly=True,
        lazy="selectin",
    )

    @property
    def variant_attributes(self) -> list[dict]:
        """Group the product's linked values back into {name, options} form."""
        groups: dict[str, list[str]] = {}
        for value in self.attribute_values:
            groups.setdefault(value.attribute.name, []).append(value.value)
        return [{"name": name, "options": options} for name, options in groups.items()]


class ProductVariant(Base, TimestampMixin, AuditMixin):
    """A concrete variant (one value per attribute) with its own SKU / pricing."""

    __tablename__ = "product_variants"

    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sku: Mapped[str | None] = mapped_column(String(100), nullable=True)
    barcode: Mapped[str | None] = mapped_column(String(64), nullable=True)
    sale_price: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    purchase_price: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)

    product: Mapped[Product] = relationship(back_populates="variants")
    values: Mapped[list[AttributeValue]] = relationship(secondary=variant_values, lazy="selectin")
