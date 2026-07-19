from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestError, ConflictError, NotFoundError
from app.core.utils import slugify
from app.modules.orgs.models import Membership
from app.modules.rbac.constants import DEFAULT_ROLES, PERMISSION_CATALOG
from app.modules.rbac.models import Permission, Role
from app.modules.rbac.schemas import RoleCreate, RoleUpdate


class RbacService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def seed_permissions(self) -> dict[str, Permission]:
        """Ensure every permission in the catalog exists. Returns code -> Permission."""
        existing = {p.code: p for p in self.db.scalars(select(Permission)).all()}
        for code, module, action in PERMISSION_CATALOG:
            if code not in existing:
                perm = Permission(code=code, module=module, action=action, description=None)
                self.db.add(perm)
                existing[code] = perm
        self.db.flush()
        return existing

    def create_default_roles(self, org_id: int) -> dict[str, Role]:
        """Create the default system roles for a freshly created org."""
        perms_by_code = self.seed_permissions()
        all_perms = list(perms_by_code.values())
        roles: dict[str, Role] = {}
        for slug, spec in DEFAULT_ROLES.items():
            codes = spec["permissions"]
            perms = all_perms if codes == "*" else [perms_by_code[c] for c in codes if c in perms_by_code]
            role = Role(
                org_id=org_id,
                name=spec["name"],
                slug=slug,
                description=spec["description"],
                is_system=True,
                permissions=perms,
            )
            self.db.add(role)
            roles[slug] = role
        self.db.flush()
        return roles

    def resolve_permissions(self, codes: list[str]) -> list[Permission]:
        if not codes:
            return []
        return list(self.db.scalars(select(Permission).where(Permission.code.in_(codes))).all())

    def list_permissions(self) -> list[Permission]:
        return list(
            self.db.scalars(select(Permission).order_by(Permission.module, Permission.action)).all()
        )

    def list_roles(self, org_id: int) -> list[Role]:
        return list(self.db.scalars(select(Role).where(Role.org_id == org_id).order_by(Role.id)).all())

    def get_role_in_org(self, org_id: int, role_id: int) -> Role:
        role = self.db.scalar(select(Role).where(Role.id == role_id, Role.org_id == org_id))
        if role is None:
            raise NotFoundError("Role not found")
        return role

    def _unique_role_slug(self, org_id: int, name: str) -> str:
        base = slugify(name)
        candidate = base
        i = 2
        while (
            self.db.scalar(select(Role.id).where(Role.org_id == org_id, Role.slug == candidate))
            is not None
        ):
            candidate = f"{base}-{i}"
            i += 1
        return candidate

    def create_role(self, *, org_id: int, payload: RoleCreate) -> Role:
        role = Role(
            org_id=org_id,
            name=payload.name,
            slug=self._unique_role_slug(org_id, payload.name),
            description=payload.description,
            is_system=False,
            permissions=self.resolve_permissions(payload.permissions),
        )
        self.db.add(role)
        self.db.commit()
        self.db.refresh(role)
        return role

    def update_role(self, *, org_id: int, role_id: int, payload: RoleUpdate) -> Role:
        role = self.get_role_in_org(org_id, role_id)
        if role.is_system:
            raise BadRequestError("System roles cannot be modified")
        if payload.name is not None:
            role.name = payload.name
        if payload.description is not None:
            role.description = payload.description
        if payload.permissions is not None:
            role.permissions = self.resolve_permissions(payload.permissions)
        self.db.commit()
        self.db.refresh(role)
        return role

    def delete_role(self, *, org_id: int, role_id: int) -> None:
        role = self.get_role_in_org(org_id, role_id)
        if role.is_system:
            raise BadRequestError("System roles cannot be deleted")
        in_use = self.db.scalar(
            select(func.count()).select_from(Membership).where(Membership.role_id == role.id)
        )
        if in_use:
            raise ConflictError("Role is assigned to members; reassign them first")
        self.db.delete(role)
        self.db.commit()
