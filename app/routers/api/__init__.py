from fastapi import APIRouter

from . import admin, user

router = APIRouter(prefix="/api")
router.include_router(user.router, tags=["user"])
router.include_router(admin.router, tags=["admin"])
