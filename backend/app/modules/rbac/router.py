from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select

from app.api.deps import CurrentMembership, DbSession, require_permission
from app.core.responses import EnvelopeRoute
from app.core.utils import slugify
from app.modules.orgs.models import Membership
from app.modules.rbac.models import Permission, Role
from app.modules.rbac.schemas import PermissionRead, RoleCreate, RoleRead, RoleUpdate
from app.modules.rbac.service import resolve_permissions

router = APIRouter(tags=["rbac"], route_class=EnvelopeRoute)


@router.get("/permissions", response_model=list[PermissionRead])
def list_permissions(membership: CurrentMembership, db: DbSession) -> list[Permission]:
    return list(db.scalars(select(Permission).order_by(Permission.module, Permission.action)).all())


@router.get("/roles", response_model=list[RoleRead])
def list_roles(
    db: DbSession,
    membership: Membership = Depends(require_permission("roles:read")),
) -> list[Role]:
    return list(
        db.scalars(
            select(Role).where(Role.org_id == membership.org_id).order_by(Role.id)
        ).all()
    )


def _get_role_in_org(db: DbSession, org_id: int, role_id: int) -> Role:
    role = db.scalar(select(Role).where(Role.id == role_id, Role.org_id == org_id))
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    return role


def _unique_role_slug(db: DbSession, org_id: int, name: str) -> str:
    base = slugify(name)
    candidate = base
    i = 2
    while (
        db.scalar(
            select(Role.id).where(Role.org_id == org_id, Role.slug == candidate)
        )
        is not None
    ):
        candidate = f"{base}-{i}"
        i += 1
    return candidate


@router.post("/roles", response_model=RoleRead, status_code=status.HTTP_201_CREATED)
def create_role(
    payload: RoleCreate,
    db: DbSession,
    membership: Membership = Depends(require_permission("roles:create")),
) -> Role:
    role = Role(
        org_id=membership.org_id,
        name=payload.name,
        slug=_unique_role_slug(db, membership.org_id, payload.name),
        description=payload.description,
        is_system=False,
        permissions=resolve_permissions(db, payload.permissions),
    )
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@router.get("/roles/{role_id}", response_model=RoleRead)
def get_role(
    role_id: int,
    db: DbSession,
    membership: Membership = Depends(require_permission("roles:read")),
) -> Role:
    return _get_role_in_org(db, membership.org_id, role_id)


@router.patch("/roles/{role_id}", response_model=RoleRead)
def update_role(
    role_id: int,
    payload: RoleUpdate,
    db: DbSession,
    membership: Membership = Depends(require_permission("roles:update")),
) -> Role:
    role = _get_role_in_org(db, membership.org_id, role_id)
    if role.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System roles cannot be modified",
        )
    if payload.name is not None:
        role.name = payload.name
    if payload.description is not None:
        role.description = payload.description
    if payload.permissions is not None:
        role.permissions = resolve_permissions(db, payload.permissions)
    db.commit()
    db.refresh(role)
    return role


@router.delete("/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(
    role_id: int,
    db: DbSession,
    membership: Membership = Depends(require_permission("roles:delete")),
) -> None:
    role = _get_role_in_org(db, membership.org_id, role_id)
    if role.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System roles cannot be deleted",
        )
    in_use = db.scalar(
        select(func.count()).select_from(Membership).where(Membership.role_id == role.id)
    )
    if in_use:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Role is assigned to members; reassign them first",
        )
    db.delete(role)
    db.commit()
