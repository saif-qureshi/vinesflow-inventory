from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.utils import slugify
from app.modules.orgs.models import Membership, Organization
from app.modules.rbac.constants import OWNER_ROLE_SLUG
from app.modules.rbac.service import create_default_roles
from app.modules.users.models import User


def _unique_slug(db: Session, base: str) -> str:
    slug = slugify(base)
    candidate = slug
    i = 2
    while db.scalar(select(Organization.id).where(Organization.slug == candidate)) is not None:
        candidate = f"{slug}-{i}"
        i += 1
    return candidate


def create_org_with_owner(
    db: Session, *, owner: User, name: str, slug: str | None = None, currency: str = "PKR"
) -> Organization:
    """Create an org, seed its default roles, and make `owner` its super admin."""
    org = Organization(name=name, slug=_unique_slug(db, slug or name), currency=currency)
    db.add(org)
    db.flush()  # assign org.id

    roles = create_default_roles(db, org.id)
    owner_role = roles[OWNER_ROLE_SLUG]

    membership = Membership(
        user_id=owner.id, org_id=org.id, role_id=owner_role.id, is_owner=True
    )
    db.add(membership)
    db.flush()
    return org
