from __future__ import annotations

from sqlalchemy import ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import AuditMixin, Base, TimestampMixin


class Setting(Base, TimestampMixin, AuditMixin):
    __tablename__ = "settings"
    __table_args__ = (
        UniqueConstraint("org_id", "group", "key", name="uq_setting_org_group_key"),
        Index("ix_settings_org_group", "org_id", "group"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    group: Mapped[str] = mapped_column(String(50), nullable=False)
    key: Mapped[str] = mapped_column(String(100), nullable=False)
    value: Mapped[dict] = mapped_column(JSONB, nullable=False)
