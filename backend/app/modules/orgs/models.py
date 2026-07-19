from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin

if TYPE_CHECKING:
    from app.modules.rbac.models import Role
    from app.modules.users.models import User


class Organization(Base, TimestampMixin):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    currency: Mapped[str] = mapped_column(
        String(3), default="PKR", server_default="PKR", nullable=False
    )
    industry: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Month the fiscal year starts (1=January … 7=July). PKR default is July–June.
    fiscal_year_start_month: Mapped[int] = mapped_column(
        default=7, server_default="7", nullable=False
    )
    logo_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    # Branding / appearance
    theme: Mapped[str] = mapped_column(String(10), default="light", server_default="light", nullable=False)
    accent_color: Mapped[str] = mapped_column(
        String(9), default="#2563eb", server_default="#2563eb", nullable=False
    )
    keep_branding: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", nullable=False
    )

    memberships: Mapped[list[Membership]] = relationship(
        back_populates="organization", cascade="all, delete-orphan"
    )
    roles: Mapped[list[Role]] = relationship(
        back_populates="organization", cascade="all, delete-orphan"
    )


class Membership(Base, TimestampMixin):
    """Links a user to an organization with exactly one role in that org."""

    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("user_id", "org_id", name="uq_membership_user_org"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    org_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    role_id: Mapped[int] = mapped_column(
        ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False
    )
    # The org creator/owner. Cannot be removed or demoted by others.
    is_owner: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped[User] = relationship(back_populates="memberships")
    organization: Mapped[Organization] = relationship(back_populates="memberships")
    role: Mapped[Role] = relationship(back_populates="memberships")
