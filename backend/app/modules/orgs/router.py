from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.api.deps import CurrentMembership, CurrentUser, DbSession, require_permission
from app.core.responses import EnvelopeRoute
from app.modules.orgs.models import Membership, Organization
from app.modules.orgs.schemas import (
    MemberAdd,
    MemberRead,
    MemberUpdate,
    OrgCreate,
    OrgMembership,
    OrgRead,
    OrgUpdate,
)
from app.modules.orgs.service import create_org_with_owner
from app.modules.rbac.constants import ALL_PERMISSION_CODES
from app.modules.rbac.models import Role
from app.modules.users.models import User

router = APIRouter(prefix="/orgs", tags=["orgs"], route_class=EnvelopeRoute)


@router.get("", response_model=list[OrgMembership])
def list_my_orgs(current_user: CurrentUser, db: DbSession) -> list[Membership]:
    return list(
        db.scalars(
            select(Membership)
            .where(Membership.user_id == current_user.id)
            .options(joinedload(Membership.organization), joinedload(Membership.role))
            .order_by(Membership.created_at)
        ).all()
    )


@router.post("", response_model=OrgRead, status_code=status.HTTP_201_CREATED)
def create_org(payload: OrgCreate, current_user: CurrentUser, db: DbSession) -> Organization:
    org = create_org_with_owner(
        db, owner=current_user, name=payload.name, slug=payload.slug, currency=payload.currency
    )
    db.commit()
    db.refresh(org)
    return org


@router.get("/current", response_model=OrgRead)
def get_current_org(membership: CurrentMembership) -> Organization:
    return membership.organization


@router.get("/current/my-permissions", response_model=list[str])
def my_permissions(membership: CurrentMembership) -> list[str]:
    if membership.user.is_superuser or membership.is_owner:
        return sorted(ALL_PERMISSION_CODES)
    return sorted({p.code for p in membership.role.permissions})


@router.patch("/current", response_model=OrgRead)
def update_current_org(
    payload: OrgUpdate,
    db: DbSession,
    membership: Membership = Depends(require_permission("orgs:update")),
) -> Organization:
    org = membership.organization
    if payload.name is not None:
        org.name = payload.name
    if payload.currency is not None:
        org.currency = payload.currency.upper()
    if payload.industry is not None:
        org.industry = payload.industry
    if payload.fiscal_year_start_month is not None:
        org.fiscal_year_start_month = payload.fiscal_year_start_month
    if payload.logo_url is not None:
        org.logo_url = payload.logo_url or None
    if payload.theme is not None:
        org.theme = payload.theme
    if payload.accent_color is not None:
        org.accent_color = payload.accent_color
    if payload.keep_branding is not None:
        org.keep_branding = payload.keep_branding
    db.commit()
    db.refresh(org)
    return org


# ---- Members -------------------------------------------------------------

def _load_members(db: DbSession, org_id: int) -> list[Membership]:
    return list(
        db.scalars(
            select(Membership)
            .where(Membership.org_id == org_id)
            .options(joinedload(Membership.user), joinedload(Membership.role))
            .order_by(Membership.created_at)
        ).all()
    )


@router.get("/current/members", response_model=list[MemberRead])
def list_members(
    db: DbSession,
    membership: Membership = Depends(require_permission("users:read")),
) -> list[Membership]:
    return _load_members(db, membership.org_id)


def _get_org_role(db: DbSession, org_id: int, role_id: int) -> Role:
    role = db.scalar(select(Role).where(Role.id == role_id, Role.org_id == org_id))
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    return role


@router.post("/current/members", response_model=MemberRead, status_code=status.HTTP_201_CREATED)
def add_member(
    payload: MemberAdd,
    db: DbSession,
    membership: Membership = Depends(require_permission("users:create")),
) -> Membership:
    org_id = membership.org_id
    role = _get_org_role(db, org_id, payload.role_id)

    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered user with that email. They must sign up first.",
        )

    existing = db.scalar(
        select(Membership).where(
            Membership.org_id == org_id, Membership.user_id == user.id
        )
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="User is already a member"
        )

    new_member = Membership(user_id=user.id, org_id=org_id, role_id=role.id, is_owner=False)
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return new_member


@router.patch("/current/members/{membership_id}", response_model=MemberRead)
def update_member_role(
    membership_id: int,
    payload: MemberUpdate,
    db: DbSession,
    membership: Membership = Depends(require_permission("users:update")),
) -> Membership:
    target = db.scalar(
        select(Membership).where(
            Membership.id == membership_id, Membership.org_id == membership.org_id
        )
    )
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    if target.is_owner:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot change the owner's role"
        )
    role = _get_org_role(db, membership.org_id, payload.role_id)
    target.role_id = role.id
    db.commit()
    db.refresh(target)
    return target


@router.delete("/current/members/{membership_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    membership_id: int,
    db: DbSession,
    membership: Membership = Depends(require_permission("users:delete")),
) -> None:
    target = db.scalar(
        select(Membership).where(
            Membership.id == membership_id, Membership.org_id == membership.org_id
        )
    )
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    if target.is_owner:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove the org owner"
        )
    db.delete(target)
    db.commit()
