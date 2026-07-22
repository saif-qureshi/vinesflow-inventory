from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.documents.models import DocumentSequence


def next_number(db: Session, org_id: int, seq_type: str, default_prefix: str) -> str:
    seq = db.scalar(
        select(DocumentSequence)
        .where(DocumentSequence.org_id == org_id, DocumentSequence.type == seq_type)
        .with_for_update()
    )
    if seq is None:
        seq = DocumentSequence(org_id=org_id, type=seq_type, prefix=default_prefix)
        db.add(seq)
        db.flush()
    number = seq.next_number
    seq.next_number = number + 1
    return f"{seq.prefix}-{number:0{seq.padding}d}"
