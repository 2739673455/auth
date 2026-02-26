"""用户管理接口"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import user as user_error
from app.repositories import token as token_repo
from app.repositories import user as user_repo
from app.schemas import admin as admin_schema
from app.schemas.admin import _format_datetime
from app.utils import db
from app.utils.log import logger

router = APIRouter()


@router.post("/create_user", status_code=status.HTTP_201_CREATED)
async def api_create_user(
    body: admin_schema.CreateUserRequest,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
) -> admin_schema.UserInfo:
    """创建用户"""
    # 检查邮箱是否已经注册
    if await user_repo.get_by_email(db_session, body.email):
        raise user_error.EmailAlreadyExistsError  # 邮箱已注册

    # 创建用户
    user = await user_repo.create(db_session, body.email, body.username, body.password)

    logger.info(f"Admin created user: {user.email}")
    return admin_schema.UserInfo.from_user(user)


@router.post("/update_user")
async def api_update_user(
    body: admin_schema.UpdateUserRequest,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
) -> admin_schema.UserInfo:
    """更新用户信息"""
    # 获取用户信息
    user = await user_repo.get_by_id(db_session, body.user_id)
    # 检查用户是否存在
    if not user:
        raise user_error.UserNotFoundError  # 用户不存在

    # 检查邮箱是否已经注册
    if (
        body.email
        and body.email != user.email
        and await user_repo.get_by_email(db_session, body.email)
    ):
        raise user_error.EmailAlreadyExistsError  # 邮箱已注册

    # 更新用户信息
    await user_repo.update(
        db_session,
        user,
        email=body.email,
        username=body.username,
        password=body.password,
        yn=body.yn,
    )

    # 如果禁用用户，撤销用户所有访问令牌
    if body.yn == 0:
        await token_repo.revoke_all(user.id)

    logger.info(f"Admin updated user: user_id={user.id}")
    return admin_schema.UserInfo.from_user(user)


@router.post("/remove_user")
async def api_remove_user(
    body: admin_schema.RemoveUserRequest,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
) -> None:
    """删除用户"""
    # 获取用户信息
    user = await user_repo.get_by_id(db_session, body.user_id)
    # 检查用户是否存在
    if not user:
        raise user_error.UserNotFoundError  # 用户不存在

    # 删除用户
    await user_repo.remove(db_session, body.user_id)

    # 撤销用户所有访问令牌
    await token_repo.revoke_all(user.id)

    logger.info(f"Admin removed user: {user.name}-{user.email}")


@router.get("/list_users")
async def api_list_users(
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
    offset: int = Query(default=0, ge=0, description="偏移量"),
    limit: int = Query(default=100, ge=10, le=1000, description="每页数量"),
    keyword: str | None = Query(default=None, description="搜索关键字"),
) -> admin_schema.UserListResponse:
    """查询所有用户（支持分页和搜索）"""
    users, total = await user_repo.ls(db_session, offset, limit, keyword)
    return admin_schema.UserListResponse(
        total=total, items=[admin_schema.UserInfo.from_user(user) for user in users]
    )


@router.get("/user/{user_id}")
async def api_get_user(
    user_id: int,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
) -> admin_schema.UserDetailResponse:
    """查询用户详情（包括组和权限）"""
    # 获取用户信息（预加载组和权限）
    user = await user_repo.get_by_id_with_group_scope(db_session, user_id)
    # 检查用户是否存在
    if not user:
        raise user_error.UserNotFoundError  # 用户不存在

    # 获取用户的组
    groups = [admin_schema.GroupInfo.from_group(g) for g in user.group]
    # 获取用户的权限
    seen_scope_ids = set()
    scopes = []
    for g in user.group:
        for s in g.scope:
            if s.id not in seen_scope_ids:
                seen_scope_ids.add(s.id)
                scopes.append(admin_schema.ScopeInfo.from_scope(s))

    return admin_schema.UserDetailResponse(
        id=user.id,
        email=user.email,
        username=user.name,
        yn=user.yn,
        create_at=_format_datetime(user.create_at),
        groups=groups,
        scopes=scopes,
    )
