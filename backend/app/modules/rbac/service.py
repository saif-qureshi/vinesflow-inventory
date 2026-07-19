from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.rbac.constants import DEFAULT_ROLES, PERMISSION_CATALOG
from app.modules.rbac.models import Permission, Role


def seed_permissions(db: Session) -> dict[str, Permission]:
    """Ensure every permission in the catalog exists. Returns code -> Permission."""
    existing = {p.code: p for p in db.scalars(select(Permission)).all()}
    for code, module, action in PERMISSION_CATALOG:
        if code not in existing:
            perm = Permission(code=code, module=module, action=action, description=None)
            db.add(perm)
            existing[code] = perm
    db.flush()
    return existing


def create_default_roles(db: Session, org_id: int) -> dict[str, Role]:
    """Create the default system roles for a freshly created org."""
    perms_by_code = seed_permissions(db)
    all_perms = list(perms_by_code.values())
    roles: dict[str, Role] = {}
    for slug, spec in DEFAULT_ROLES.items():
        codes = spec["permissions"]
        if codes == "*":
            perms = all_perms
        else:
            perms = [perms_by_code[c] for c in codes if c in perms_by_code]
        role = Role(
            org_id=org_id,
            name=spec["name"],
            slug=slug,
            description=spec["description"],
            is_system=True,
            permissions=perms,
        )
        db.add(role)
        roles[slug] = role
    db.flush()
    return roles


def resolve_permissions(db: Session, codes: list[str]) -> list[Permission]:
    if not codes:
        return []
    return list(db.scalars(select(Permission).where(Permission.code.in_(codes))).all())
