from pydantic import BaseModel, EmailStr, Field

from app.modules.orgs.schemas import OrgMembership
from app.modules.users.schemas import UserRead


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = None
    org_name: str = Field(min_length=1, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    message: str


class MeResponse(BaseModel):
    user: UserRead
    memberships: list[OrgMembership]
