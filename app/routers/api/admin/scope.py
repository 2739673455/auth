"""权限管理接口"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import scope as scope_error
from app.repositories import scope as scope_repo
from app.schemas import admin as admin_schema
from app.services import token as token_service
from app.utils import db
from app.utils.log import logger

router = APIRouter()


@router.post("/create_scope", status_code=status.HTTP_201_CREATED)
async def api_create_scope(
    body: admin_schema.CreateScopeRequest,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
) -> admin_schema.ScopeInfo:
    """创建权限"""
    # 检查权限名是否已存在
    if await scope_repo.get_by_name(db_session, body.name):
        raise scope_error.ScopeNameExistsError  # 权限名已存在

    # 创建权限
    scope = await scope_repo.create(db_session, body.name, body.description)

    logger.info(f"Admin created scope: {scope.name}")
    return admin_schema.ScopeInfo.from_scope(scope)


@router.post("/update_scope")
async def api_update_scope(
    body: admin_schema.UpdateScopeRequest,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
) -> admin_schema.ScopeInfo:
    """更新权限信息"""
    # 获取权限
    scope = await scope_repo.get_by_id(db_session, body.scope_id)
    # 检查权限是否存在
    if not scope:
        raise scope_error.ScopeNotFoundError  # 权限不存在

    # 检查权限名是否已存在
    if (
        body.name
        and body.name != scope.name
        and await scope_repo.get_by_name(db_session, body.name)
    ):
        raise scope_error.ScopeNameExistsError  # 权限名已存在

    # 保存原来的 yn 值
    original_yn = scope.yn

    # 更新权限信息
    await scope_repo.update(
        db_session, scope, name=body.name, description=body.description, yn=body.yn
    )

    # 如果禁用/启用权限，或修改权限名，更新所有涉及用户的访问令牌权限
    if (body.yn is not None and body.yn != original_yn) or (
        body.name is not None and body.name != scope.name
    ):
        # 获取权限关联的组及组内用户
        scope_with_groups = await scope_repo.get_by_id_with_group_user(
            db_session, body.scope_id
        )
        if scope_with_groups and scope_with_groups.group:
            user_ids = {u.id for g in scope_with_groups.group if g.yn for u in g.user}
            await token_service.update_users_tokens(db_session, user_ids)

    logger.info(f"Admin updated scope: scope_id={scope.id}")
    return admin_schema.ScopeInfo.from_scope(scope)


@router.post("/remove_scope")
async def api_remove_scope(
    body: admin_schema.RemoveScopeRequest,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
) -> None:
    """删除权限"""
    # 获取权限关联的组及组内用户
    scope = await scope_repo.get_by_id_with_group_user(db_session, body.scope_id)
    if not scope:
        raise scope_error.ScopeNotFoundError  # 权限不存在

    # 收集需要更新令牌的用户
    user_ids = {u.id for g in scope.group if g.yn for u in g.user}

    # 删除权限
    await scope_repo.remove(db_session, body.scope_id)

    # 更新所有涉及用户的访问令牌权限
    await token_service.update_users_tokens(db_session, user_ids)

    logger.info(f"Admin removed scope: {scope.name}")


@router.get("/list_scopes")
async def api_list_scopes(
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
    offset: int = Query(default=0, ge=0, description="偏移量"),
    limit: int = Query(default=20, ge=1, le=100, description="每页数量"),
    keyword: str | None = Query(default=None, description="搜索关键字"),
) -> admin_schema.ScopeListResponse:
    """查询所有权限（支持分页和搜索）"""
    scopes, total = await scope_repo.ls(db_session, offset, limit, keyword)
    return admin_schema.ScopeListResponse(
        total=total,
        items=[admin_schema.ScopeInfo.from_scope(scope) for scope in scopes],
    )


@router.get("/scope/{scope_id}")
async def api_get_scope(
    scope_id: int,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
) -> admin_schema.ScopeDetailResponse:
    """查询权限详情（包括拥有此权限的组和用户）"""
    # 获取权限、组及组内用户信息
    scope = await scope_repo.get_by_id_with_group_user(db_session, scope_id)
    # 检查权限是否存在
    if not scope:
        raise scope_error.ScopeNotFoundError  # 权限不存在

    # 获取权限的组
    groups = [admin_schema.GroupInfo.from_group(g) for g in scope.group]
    # 获取权限的用户
    seen_user_ids = set()
    users = []
    for g in scope.group:
        for u in g.user:
            if u.id not in seen_user_ids:
                seen_user_ids.add(u.id)
                users.append(admin_schema.UserInfo.from_user(u))

    return admin_schema.ScopeDetailResponse(
        id=scope.id,
        name=scope.name,
        description=scope.description,
        yn=scope.yn,
        create_at=admin_schema._format_datetime(scope.create_at),
        groups=groups,
        users=users,
    )
