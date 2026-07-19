from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.modules.media.models import MediaAsset
from app.modules.media.schemas import MediaCreate


class MediaService:
    """Manages the polymorphic media table for any attachable entity."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def list_for(self, attachable_type: str, attachable_id: int) -> list[MediaAsset]:
        return list(
            self.db.scalars(
                select(MediaAsset)
                .where(
                    MediaAsset.attachable_type == attachable_type,
                    MediaAsset.attachable_id == attachable_id,
                )
                .order_by(MediaAsset.sort_order)
            ).all()
        )

    def delete_for(self, attachable_type: str, attachable_id: int) -> None:
        self.db.execute(
            delete(MediaAsset).where(
                MediaAsset.attachable_type == attachable_type,
                MediaAsset.attachable_id == attachable_id,
            )
        )

    def replace_for(
        self,
        *,
        org_id: int,
        attachable_type: str,
        attachable_id: int,
        media: list[MediaCreate],
    ) -> None:
        self.delete_for(attachable_type, attachable_id)
        for i, item in enumerate(media):
            self.db.add(
                MediaAsset(
                    org_id=org_id,
                    attachable_type=attachable_type,
                    attachable_id=attachable_id,
                    url=item.url,
                    filename=item.filename,
                    content_type=item.content_type,
                    size=item.size,
                    sort_order=item.sort_order or i,
                )
            )
