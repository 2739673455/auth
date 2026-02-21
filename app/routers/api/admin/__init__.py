from fastapi import APIRouter, Depends

from app.services import scope as scope_service

from . import group, relation, scope, user

router = APIRouter(
    prefix="/admin",
    dependencies=[Depends(scope_service.require_admin_scope)],
)

router.include_router(user.router)
router.include_router(group.router)
router.include_router(scope.router)
router.include_router(relation.router)
