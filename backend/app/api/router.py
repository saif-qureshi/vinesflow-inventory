from fastapi import APIRouter

from app.modules.auth.router import router as auth_router
from app.modules.orgs.router import router as orgs_router
from app.modules.rbac.router import router as rbac_router
from app.modules.users.router import router as users_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(orgs_router)
api_router.include_router(rbac_router)
