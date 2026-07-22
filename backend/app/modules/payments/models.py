from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import AuditMixin, Base, TimestampMixin
from app.modules.documents.enums import PaymentMethod, PaymentStatus
from app.modules.parties.models import Party

_MONEY = Numeric(18, 2)


class Payment(Base, TimestampMixin, AuditMixin):
    __tablename__ = "payments"
    __table_args__ = (
        UniqueConstraint("org_id", "direction", "number", name="uq_payment_org_direction_number"),
        Index("ix_payments_org_direction", "org_id", "direction"),
        Index("ix_payments_org_party", "org_id", "party_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    direction: Mapped[str] = mapped_column(String(10), nullable=False)
    number: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(String(12), default=PaymentStatus.DRAFT, nullable=False)

    party_id: Mapped[int | None] = mapped_column(
        ForeignKey("parties.id", ondelete="SET NULL"), index=True, nullable=True
    )
    party_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    document_date: Mapped[date] = mapped_column(Date, nullable=False)
    posting_date: Mapped[date] = mapped_column(Date, nullable=False)
    method: Mapped[str] = mapped_column(String(20), default=PaymentMethod.CASH, nullable=False)

    amount: Mapped[Decimal] = mapped_column(_MONEY, default=0, nullable=False)
    allocated_amount: Mapped[Decimal] = mapped_column(_MONEY, default=0, nullable=False)
    unapplied_amount: Mapped[Decimal] = mapped_column(_MONEY, default=0, nullable=False)

    reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    submitted_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    allocations: Mapped[list[PaymentAllocation]] = relationship(
        back_populates="payment", cascade="all, delete-orphan", lazy="selectin"
    )
    party: Mapped[Party | None] = relationship(lazy="selectin")


class PaymentAllocation(Base, TimestampMixin):
    __tablename__ = "payment_allocations"
    __table_args__ = (
        UniqueConstraint("payment_id", "document_id", name="uq_payment_allocation_payment_document"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    payment_id: Mapped[int] = mapped_column(
        ForeignKey("payments.id", ondelete="CASCADE"), index=True, nullable=False
    )
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False
    )
    document_number: Mapped[str] = mapped_column(String(40), nullable=False)
    amount: Mapped[Decimal] = mapped_column(_MONEY, nullable=False)

    payment: Mapped[Payment] = relationship(back_populates="allocations")
