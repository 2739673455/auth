"""组管理接口"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import group as group_error
from app.repositories import group as group_repo
from app.schemas import admin as admin_schema
from app.utils import db
from app.utils.log import logger

router = APIRouter()


@router.post("/create_group", status_code=status.HTTP_201_CREATED)
async def api_create_group(
    body: admin_schema.CreateGroupRequest,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
) -> admin_schema.GroupInfo:
    """创建组"""
    # 检查组名是否已存在
    if await group_repo.get_by_name(db_session, body.name):
        raise group_error.GroupNameExistsError  # 组名已存在
    # 创建组
    group = await group_repo.create(db_session, body.name)
    logger.info(f"Admin created group: {group.name}")
    return admin_schema.GroupInfo.from_group(group)


@router.post("/update_group")
async def api_update_group(
    body: admin_schema.UpdateGroupRequest,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
) -> admin_schema.GroupInfo:
    """更新组信息"""
    # 获取组
    group = await group_repo.get_by_id(db_session, body.group_id)
    # 检查组是否存在
    if not group:
        raise group_error.GroupNotFoundError  # 组不存在
    # 检查组名是否已存在
    if (
        body.name
        and body.name != group.name
        and await group_repo.get_by_name(db_session, body.name)
    ):
        raise group_error.GroupNameExistsError
    # 更新组信息
    await group_repo.update(db_session, group, name=body.name, yn=body.yn)
    logger.info(f"Admin updated group: group_id={group.id}")
    return admin_schema.GroupInfo.from_group(group)


@router.post("/remove_group")
async def api_remove_group(
    body: admin_schema.RemoveGroupRequest,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
) -> None:
    """删除组"""
    await group_repo.remove(db_session, body.group_id)


@router.get("/list_groups")
async def api_list_groups(
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
    offset: int = Query(default=0, ge=0, description="偏移量"),
    limit: int = Query(default=20, ge=1, le=100, description="每页数量"),
    keyword: str | None = Query(default=None, description="搜索关键字"),
) -> admin_schema.GroupListResponse:
    """查询所有组（支持分页和搜索）"""
    groups, total = await group_repo.ls(db_session, offset, limit, keyword)
    return admin_schema.GroupListResponse(
        total=total,
        items=[admin_schema.GroupInfo.from_group(group) for group in groups],
    )


@router.get("/group/{group_id}")
async def api_get_group(
    group_id: int,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
) -> admin_schema.GroupDetailResponse:
    """查询组详情（包括用户和权限）"""
    # 获取组、用户、权限信息
    group = await group_repo.get_by_id_with_user_scope(db_session, group_id)
    # 检查组是否存在
    if not group:
        raise group_error.GroupNotFoundError  # 组不存在
    users = [admin_schema.UserInfo.from_user(u) for u in group.user]
    scopes = [admin_schema.ScopeInfo.from_scope(s) for s in group.scope]
    return admin_schema.GroupDetailResponse(
        id=group.id,
        name=group.name,
        yn=group.yn,
        create_at=admin_schema._format_datetime(group.create_at),
        users=users,
        scopes=scopes,
    )
