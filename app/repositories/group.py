"""组数据访问"""

from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.entities.auth import Group, Scope


async def get_by_name(
    db_session: AsyncSession,
    name: str,
    options: Literal["scope"] | None = None,
) -> Group | None:
    """通过名称获取组

    Args:
        db_session: 数据库会话
        name: 组名称
        options: 预加载选项
            - "scope": 预加载关联的权限
    """
    stmt = select(Group).where(Group.name == name)

    if options == "scope":
        stmt = stmt.options(selectinload(Group.scope.and_(Scope.yn == 1)))

    result = await db_session.execute(stmt)
    if options:
        return result.unique().scalar_one_or_none()
    return result.scalar_one_or_none()


async def get_by_id(db_session: AsyncSession, group_id: int) -> Group | None:
    """通过 ID 获取组"""
    stmt = select(Group).where(Group.id == group_id)
    result = await db_session.execute(stmt)
    return result.scalar_one_or_none()
