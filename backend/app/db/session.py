from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.db.base_class import AuditMixin

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, class_=Session)


@event.listens_for(Session, "before_flush")
def _stamp_audit_actor(session: Session, flush_context, instances) -> None:
    """Fill created_by_id / updated_by_id from the request actor on the session."""
    actor_id = session.info.get("actor_id")
    if actor_id is None:
        return
    for obj in session.new:
        if isinstance(obj, AuditMixin):
            if obj.created_by_id is None:
                obj.created_by_id = actor_id
            obj.updated_by_id = actor_id
    for obj in session.dirty:
        if isinstance(obj, AuditMixin) and session.is_modified(obj, include_collections=False):
            obj.updated_by_id = actor_id


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
