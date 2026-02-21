"""关联关系管理接口"""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

import app.repositories.relation
from app.schemas import admin as admin_schema
from app.utils import db
from app.utils.log import logger

router = APIRouter()


# ========== 用户-组关联 ==========
@router.post("/user-group/add", status_code=status.HTTP_201_CREATED)
async def api_add_user_group(
    body: admin_schema.BatchAddUserGroupRequest,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
) -> None:
    """批量添加用户-组关联"""
    user_group_tuples = [(r.user_id, r.group_id) for r in body.relations]
    await app.repositories.relation.add_user_group(db_session, user_group_tuples)
    logger.info(f"Admin batch added user-group relation {user_group_tuples}")


@router.post("/user-group/remove")
async def api_remove_user_group(
    body: admin_schema.BatchRemoveUserGroupRequest,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
) -> None:
    """批量移除用户-组关联"""
    user_group_tuples = [(r.user_id, r.group_id) for r in body.relations]
    await app.repositories.relation.remove_user_group(db_session, user_group_tuples)
    logger.info(f"Admin batch removed user-group relation {user_group_tuples}")


# ========== 组-权限关联 ==========
@router.post("/group-scope/add", status_code=status.HTTP_201_CREATED)
async def api_add_group_scope(
    body: admin_schema.BatchAddGroupScopeRequest,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
) -> None:
    """批量添加组-权限关联"""
    group_scope_tuples = [(r.group_id, r.scope_id) for r in body.relations]
    await app.repositories.relation.add_group_scope(db_session, group_scope_tuples)
    logger.info(f"Admin batch added group-scope relation {group_scope_tuples}")


@router.post("/group-scope/remove")
async def api_remove_group_scope(
    body: admin_schema.BatchRemoveGroupScopeRequest,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
) -> None:
    """批量移除组-权限关联"""
    group_scope_tuples = [(r.group_id, r.scope_id) for r in body.relations]
    await app.repositories.relation.remove_group_scope(db_session, group_scope_tuples)
    logger.info(f"Admin batch removed group-scope relation {group_scope_tuples}")
